import { ipcMain } from "electron";
import { db, getDatabasePath } from "../../db";
import { apps, chats } from "../../db/schema";
import { desc, eq } from "drizzle-orm";
import type {
  App,
  CreateAppParams,
  RenameBranchParams,
  CopyAppParams,
} from "../ipc_types";
import * as fsPromises from "fs/promises";
import fs from "node:fs";
import path from "node:path";
import { getDyadAppPath, getUserDataPath } from "../../paths/paths";
import { spawn } from "node:child_process";
import git from "isomorphic-git";

// Import our utility modules
import { withLock } from "../utils/lock_utils";
import { getFilesRecursively } from "../utils/file_utils";
import {
  runningApps,
  processCounter,
  killProcess,
  removeAppIfCurrentProcess,
} from "../utils/process_manager";
import { getEnvVar } from "../utils/read_env";
import { readSettings } from "../../main/settings";

import fixPath from "fix-path";

import killPort from "kill-port";
import util from "util";
import log from "electron-log";
import { getSupabaseProjectName } from "../../supabase_admin/supabase_management_client";
import { createLoggedHandler } from "./safe_handle";
import { getLanguageModelProviders } from "../shared/language_model_helpers";
import { startProxy } from "../utils/start_proxy_server";
import { Worker } from "worker_threads";
import { createFromTemplate } from "./createFromTemplate";
import { gitCommit } from "../utils/git_utils";
import { safeSend } from "../utils/safe_sender";
import { normalizePath } from "../processors/normalizePath";
import fse from "fs-extra";
import { glob } from "glob";

async function copyDir(
  source: string,
  destination: string,
  filter?: (source: string) => boolean,
) {
  await fsPromises.cp(source, destination, {
    recursive: true,
    filter: (src: string) => {
      if (path.basename(src) === "node_modules") {
        return false;
      }
      if (filter) {
        return filter(src);
      }
      return true;
    },
  });
}

const logger = log.scope("app_handlers");
const handle = createLoggedHandler(logger);

let proxyWorker: Worker | null = null;

// Needed, otherwise electron in MacOS/Linux will not be able
// to find node/pnpm.
fixPath();

async function executeApp({
  appPath,
  appId,
  event, // Keep event for local-node case
}: {
  appPath: string;
  appId: number;
  event: Electron.IpcMainInvokeEvent;
}): Promise<void> {
  if (proxyWorker) {
    proxyWorker.terminate();
    proxyWorker = null;
  }
  await executeAppLocalNode({ appPath, appId, event });
}

async function executeAppLocalNode({
  appPath,
  appId,
  event,
}: {
  appPath: string;
  appId: number;
  event: Electron.IpcMainInvokeEvent;
}): Promise<void> {
  const process = spawn(
    "(pnpm install && pnpm run dev --port 32100) || (npm install --legacy-peer-deps && npm run dev -- --port 32100)",
    [],
    {
      cwd: appPath,
      shell: true,
      stdio: "pipe", // Ensure stdio is piped so we can capture output/errors and detect close
      detached: false, // Ensure child process is attached to the main process lifecycle unless explicitly backgrounded
    },
  );

  // Check if process spawned correctly
  if (!process.pid) {
    // Attempt to capture any immediate errors if possible
    let errorOutput = "";
    process.stderr?.on("data", (data) => (errorOutput += data));
    await new Promise((resolve) => process.on("error", resolve)); // Wait for error event
    throw new Error(
      `Failed to spawn process for app ${appId}. Error: ${
        errorOutput || "Unknown spawn error"
      }`,
    );
  }

  // Increment the counter and store the process reference with its ID
  const currentProcessId = processCounter.increment();
  runningApps.set(appId, { process, processId: currentProcessId });

  // Log output
  process.stdout?.on("data", async (data) => {
    const message = util.stripVTControlCharacters(data.toString());
    logger.debug(`App ${appId} (PID: ${process.pid}) stdout: ${message}`);

    safeSend(event.sender, "app:output", {
      type: "stdout",
      message,
      appId,
    });
    const urlMatch = message.match(/(https?:\/\/localhost:\d+\/?)/);
    if (urlMatch) {
      proxyWorker = await startProxy(urlMatch[1], {
        onStarted: (proxyUrl) => {
          safeSend(event.sender, "app:output", {
            type: "stdout",
            message: `[dyad-proxy-server]started=[${proxyUrl}] original=[${urlMatch[1]}]`,
            appId,
          });
        },
      });
    }
  });

  process.stderr?.on("data", (data) => {
    const message = util.stripVTControlCharacters(data.toString());
    logger.error(`App ${appId} (PID: ${process.pid}) stderr: ${message}`);
    safeSend(event.sender, "app:output", {
      type: "stderr",
      message,
      appId,
    });
  });

  // Handle process exit/close
  process.on("close", (code, signal) => {
    logger.log(
      `App ${appId} (PID: ${process.pid}) process closed with code ${code}, signal ${signal}.`,
    );
    removeAppIfCurrentProcess(appId, process);
  });

  // Handle errors during process lifecycle (e.g., command not found)
  process.on("error", (err) => {
    logger.error(
      `Error in app ${appId} (PID: ${process.pid}) process: ${err.message}`,
    );
    removeAppIfCurrentProcess(appId, process);
    // Note: We don't throw here as the error is asynchronous. The caller got a success response already.
    // Consider adding ipcRenderer event emission to notify UI of the error.
  });
}

// Helper to kill process on a specific port (cross-platform, using kill-port)
async function killProcessOnPort(port: number): Promise<void> {
  try {
    await killPort(port, "tcp");
  } catch {
    // Ignore if nothing was running on that port
  }
}

export function registerAppHandlers() {
  handle(
    "create-app",
    async (
      _,
      params: CreateAppParams,
    ): Promise<{ app: any; chatId: number }> => {
      const appPath = params.name;
      const fullAppPath = getDyadAppPath(appPath);
      if (fs.existsSync(fullAppPath)) {
        throw new Error(`App already exists at: ${fullAppPath}`);
      }
      // Create a new app
      const [app] = await db
        .insert(apps)
        .values({
          name: params.name,
          // Use the name as the path for now
          path: appPath,
        })
        .returning();

      // Create an initial chat for this app
      const [chat] = await db
        .insert(chats)
        .values({
          appId: app.id,
        })
        .returning();

      await createFromTemplate({
        fullAppPath,
      });

      // Initialize git repo and create first commit
      await git.init({
        fs: fs,
        dir: fullAppPath,
        defaultBranch: "main",
      });

      // Stage all files
      await git.add({
        fs: fs,
        dir: fullAppPath,
        filepath: ".",
      });

      // Create initial commit
      const commitHash = await gitCommit({
        path: fullAppPath,
        message: "Init Trio AI ",
      });

      // Update chat with initial commit hash
      await db
        .update(chats)
        .set({
          initialCommitHash: commitHash,
        })
        .where(eq(chats.id, chat.id));

      return { app, chatId: chat.id };
    },
  );

  handle(
    "copy-app",
    async (_, params: CopyAppParams): Promise<{ app: any }> => {
      const { appId, newAppName, withHistory } = params;

      // 1. Check if an app with the new name already exists
      const existingApp = await db.query.apps.findFirst({
        where: eq(apps.name, newAppName),
      });

      if (existingApp) {
        throw new Error(`An app named "${newAppName}" already exists.`);
      }

      // 2. Find the original app
      const originalApp = await db.query.apps.findFirst({
        where: eq(apps.id, appId),
      });

      if (!originalApp) {
        throw new Error("Original app not found.");
      }

      const originalAppPath = getDyadAppPath(originalApp.path);
      const newAppPath = getDyadAppPath(newAppName);

      // 3. Copy the app folder
      try {
        await copyDir(originalAppPath, newAppPath, (source: string) => {
          if (!withHistory && path.basename(source) === ".git") {
            return false;
          }
          return true;
        });
      } catch (error) {
        logger.error("Failed to copy app directory:", error);
        throw new Error("Failed to copy app directory.");
      }

      if (!withHistory) {
        // Initialize git repo and create first commit
        await git.init({
          fs: fs,
          dir: newAppPath,
          defaultBranch: "main",
        });

        // Stage all files
        await git.add({
          fs: fs,
          dir: newAppPath,
          filepath: ".",
        });

        // Create initial commit
        await gitCommit({
          path: newAppPath,
          message: "Init Trio AI",
        });
      }

      // 4. Create a new app entry in the database
      const [newDbApp] = await db
        .insert(apps)
        .values({
          name: newAppName,
          path: newAppName, // Use the new name for the path
          // Explicitly set these to null because we don't want to copy them over.
          // Note: we could just leave them out since they're nullable field, but this
          // is to make it explicit we intentionally don't want to copy them over.
          supabaseProjectId: null,
          githubOrg: null,
          githubRepo: null,
        })
        .returning();

      return { app: newDbApp };
    },
  );

  handle("get-app", async (_, appId: number): Promise<App> => {
    const app = await db.query.apps.findFirst({
      where: eq(apps.id, appId),
    });

    if (!app) {
      throw new Error("App not found");
    }

    // Get app files
    const appPath = getDyadAppPath(app.path);
    let files: string[] = [];

    try {
      files = getFilesRecursively(appPath, appPath);
      // Normalize the path to use forward slashes so file tree (UI)
      // can parse it more consistently across platforms.
      files = files.map((path) => normalizePath(path));
    } catch (error) {
      logger.error(`Error reading files for app ${appId}:`, error);
      // Return app even if files couldn't be read
    }

    let supabaseProjectName: string | null = null;
    const settings = readSettings();
    if (app.supabaseProjectId && settings.supabase?.accessToken?.value) {
      supabaseProjectName = await getSupabaseProjectName(app.supabaseProjectId);
    }

    return {
      ...app,
      files,
      supabaseProjectName,
    };
  });

  ipcMain.handle("list-apps", async () => {
    const allApps = await db.query.apps.findMany({
      orderBy: [desc(apps.createdAt)],
    });
    return {
      apps: allApps,
      appBasePath: getDyadAppPath("$APP_BASE_PATH"),
    };
  });

  ipcMain.handle(
    "read-app-file",
    async (_, { appId, filePath }: { appId: number; filePath: string }) => {
      const app = await db.query.apps.findFirst({
        where: eq(apps.id, appId),
      });

      if (!app) {
        throw new Error("App not found");
      }

      const appPath = getDyadAppPath(app.path);
      const fullPath = path.join(appPath, filePath);

      // Check if the path is within the app directory (security check)
      if (!fullPath.startsWith(appPath)) {
        throw new Error("Invalid file path");
      }

      if (!fs.existsSync(fullPath)) {
        throw new Error("File not found");
      }

      try {
        const contents = fs.readFileSync(fullPath, "utf-8");
        return contents;
      } catch (error) {
        logger.error(`Error reading file ${filePath} for app ${appId}:`, error);
        throw new Error("Failed to read file");
      }
    },
  );

  ipcMain.handle("read-file", async (_event, { path }: { path: string }) => {
    const workspaceRoot = process.cwd();
    const fullPath = require("path").resolve(workspaceRoot, path);
    if (!fullPath.startsWith(workspaceRoot)) {
      throw new Error("Invalid file path");
    }
    try {
      const contents = require("fs").readFileSync(fullPath, "utf-8");
      return contents
        .split("\n")
        .map((content: string, idx: number) => ({ line: idx + 1, content }));
    } catch (error) {
      logger.error(`Error reading file ${path}:`, error);
      throw new Error("Failed to read file");
    }
  });

  ipcMain.handle(
    "read-files",
    async (_event, { paths }: { paths: string[] }) => {
      const workspaceRoot = process.cwd();
      const fs = require("fs");
      const pathMod = require("path");
      const contents: Record<string, { line: number; content: string }[]> = {};
      const error: Record<string, string> = {};
      for (const relPath of (paths || []).slice(0, 3)) {
        const fullPath = pathMod.resolve(workspaceRoot, relPath);
        if (!fullPath.startsWith(workspaceRoot)) {
          error[relPath] = "Invalid file path";
          continue;
        }
        try {
          const fileContent = fs.readFileSync(fullPath, "utf-8");
          contents[relPath] = fileContent
            .split("\n")
            .map((content: string, idx: number) => ({
              line: idx + 1,
              content,
            }));
        } catch {
          error[relPath] = "Failed to read file";
        }
      }
      return { contents, error };
    },
  );

  // Do NOT use handle for this, it contains sensitive information.
  ipcMain.handle("get-env-vars", async () => {
    const envVars: Record<string, string | undefined> = {};
    const providers = await getLanguageModelProviders();
    for (const provider of providers) {
      if (provider.envVarName) {
        envVars[provider.envVarName] = getEnvVar(provider.envVarName);
      }
    }
    return envVars;
  });

  ipcMain.handle(
    "run-app",
    async (
      event: Electron.IpcMainInvokeEvent,
      { appId }: { appId: number },
    ): Promise<void> => {
      return withLock(appId, async () => {
        // Check if app is already running
        if (runningApps.has(appId)) {
          logger.debug(`App ${appId} is already running.`);
          return;
        }

        const app = await db.query.apps.findFirst({
          where: eq(apps.id, appId),
        });

        if (!app) {
          throw new Error("App not found");
        }

        logger.debug(`Starting app ${appId} in path ${app.path}`);

        const appPath = getDyadAppPath(app.path);
        try {
          // Kill any orphaned process on port 32100 (in case previous run left it)
          await killProcessOnPort(32100);
          await executeApp({ appPath, appId, event });

          return;
        } catch (error: any) {
          logger.error(`Error running app ${appId}:`, error);
          // Ensure cleanup if error happens during setup but before process events are handled
          if (
            runningApps.has(appId) &&
            runningApps.get(appId)?.processId === processCounter.value
          ) {
            runningApps.delete(appId);
          }
          throw new Error(`Failed to run app ${appId}: ${error.message}`);
        }
      });
    },
  );

  ipcMain.handle(
    "stop-app",
    async (_, { appId }: { appId: number }): Promise<void> => {
      logger.log(
        `Attempting to stop app ${appId}. Current running apps: ${runningApps.size}`,
      );
      return withLock(appId, async () => {
        const appInfo = runningApps.get(appId);

        if (!appInfo) {
          logger.log(
            `App ${appId} not found in running apps map. Assuming already stopped.`,
          );
          return;
        }

        const { process, processId } = appInfo;
        logger.log(
          `Found running app ${appId} with processId ${processId} (PID: ${process.pid}). Attempting to stop.`,
        );

        // Check if the process is already exited or closed
        if (process.exitCode !== null || process.signalCode !== null) {
          logger.log(
            `Process for app ${appId} (PID: ${process.pid}) already exited (code: ${process.exitCode}, signal: ${process.signalCode}). Cleaning up map.`,
          );
          runningApps.delete(appId); // Ensure cleanup if somehow missed
          return;
        }

        try {
          // Use the killProcess utility to stop the process
          await killProcess(process);

          // Now, safely remove the app from the map *after* confirming closure
          removeAppIfCurrentProcess(appId, process);

          return;
        } catch (error: any) {
          logger.error(
            `Error stopping app ${appId} (PID: ${process.pid}, processId: ${processId}):`,
            error,
          );
          // Attempt cleanup even if an error occurred during the stop process
          removeAppIfCurrentProcess(appId, process);
          throw new Error(`Failed to stop app ${appId}: ${error.message}`);
        }
      });
    },
  );

  ipcMain.handle(
    "restart-app",
    async (
      event: Electron.IpcMainInvokeEvent,
      {
        appId,
        removeNodeModules,
      }: { appId: number; removeNodeModules?: boolean },
    ): Promise<void> => {
      logger.log(`Restarting app ${appId}`);
      return withLock(appId, async () => {
        try {
          // First stop the app if it's running
          const appInfo = runningApps.get(appId);
          if (appInfo) {
            const { process, processId } = appInfo;
            logger.log(
              `Stopping app ${appId} (processId ${processId}) before restart`,
            );

            await killProcess(process);
            runningApps.delete(appId);
          } else {
            logger.log(`App ${appId} not running. Proceeding to start.`);
          }

          // Kill any orphaned process on port 32100 (in case previous run left it)
          await killProcessOnPort(32100);

          // Now start the app again
          const app = await db.query.apps.findFirst({
            where: eq(apps.id, appId),
          });

          if (!app) {
            throw new Error("App not found");
          }

          const appPath = getDyadAppPath(app.path);

          // Remove node_modules if requested
          if (removeNodeModules) {
            const nodeModulesPath = path.join(appPath, "node_modules");
            logger.log(
              `Removing node_modules for app ${appId} at ${nodeModulesPath}`,
            );
            if (fs.existsSync(nodeModulesPath)) {
              await fsPromises.rm(nodeModulesPath, {
                recursive: true,
                force: true,
              });
              logger.log(`Successfully removed node_modules for app ${appId}`);
            } else {
              logger.log(`No node_modules directory found for app ${appId}`);
            }
          }

          logger.debug(
            `Executing app ${appId} in path ${app.path} after restart request`,
          ); // Adjusted log

          await executeApp({ appPath, appId, event }); // This will handle starting either mode

          return;
        } catch (error) {
          logger.error(`Error restarting app ${appId}:`, error);
          throw error;
        }
      });
    },
  );

  ipcMain.handle(
    "edit-app-file",
    async (
      _,
      {
        appId,
        filePath,
        content,
      }: { appId: number; filePath: string; content: string },
    ): Promise<void> => {
      const app = await db.query.apps.findFirst({
        where: eq(apps.id, appId),
      });

      if (!app) {
        throw new Error("App not found");
      }

      const appPath = getDyadAppPath(app.path);
      const fullPath = path.join(appPath, filePath);

      // Check if the path is within the app directory (security check)
      if (!fullPath.startsWith(appPath)) {
        throw new Error("Invalid file path");
      }

      // Ensure directory exists
      const dirPath = path.dirname(fullPath);
      await fsPromises.mkdir(dirPath, { recursive: true });

      try {
        await fsPromises.writeFile(fullPath, content, "utf-8");

        // Check if git repository exists and commit the change
        if (fs.existsSync(path.join(appPath, ".git"))) {
          await git.add({
            fs,
            dir: appPath,
            filepath: filePath,
          });

          await gitCommit({
            path: appPath,
            message: `Updated ${filePath}`,
          });
        }

        return;
      } catch (error: any) {
        logger.error(`Error writing file ${filePath} for app ${appId}:`, error);
        throw new Error(`Failed to write file: ${error.message}`);
      }
    },
  );

  ipcMain.handle(
    "delete-app",
    async (_, { appId }: { appId: number }): Promise<void> => {
      // Static server worker is NOT terminated here anymore

      return withLock(appId, async () => {
        // Check if app exists
        const app = await db.query.apps.findFirst({
          where: eq(apps.id, appId),
        });

        if (!app) {
          throw new Error("App not found");
        }

        // Stop the app if it's running
        if (runningApps.has(appId)) {
          const appInfo = runningApps.get(appId)!;
          try {
            logger.log(`Stopping app ${appId} before deletion.`); // Adjusted log
            await killProcess(appInfo.process);
            runningApps.delete(appId);
          } catch (error: any) {
            logger.error(`Error stopping app ${appId} before deletion:`, error); // Adjusted log
            // Continue with deletion even if stopping fails
          }
        }

        // Delete app from database
        try {
          await db.delete(apps).where(eq(apps.id, appId));
          // Note: Associated chats will cascade delete
        } catch (error: any) {
          logger.error(`Error deleting app ${appId} from database:`, error);
          throw new Error(
            `Failed to delete app from database: ${error.message}`,
          );
        }

        // Delete app files
        const appPath = getDyadAppPath(app.path);
        try {
          await fsPromises.rm(appPath, { recursive: true, force: true });
        } catch (error: any) {
          logger.error(`Error deleting app files for app ${appId}:`, error);
          throw new Error(
            `App deleted from database, but failed to delete app files. Please delete app files from ${appPath} manually.\n\nError: ${error.message}`,
          );
        }
      });
    },
  );

  ipcMain.handle(
    "rename-app",
    async (
      _,
      {
        appId,
        appName,
        appPath,
      }: { appId: number; appName: string; appPath: string },
    ): Promise<void> => {
      return withLock(appId, async () => {
        // Check if app exists
        const app = await db.query.apps.findFirst({
          where: eq(apps.id, appId),
        });

        if (!app) {
          throw new Error("App not found");
        }

        // Check for conflicts with existing apps
        const nameConflict = await db.query.apps.findFirst({
          where: eq(apps.name, appName),
        });

        const pathConflict = await db.query.apps.findFirst({
          where: eq(apps.path, appPath),
        });

        if (nameConflict && nameConflict.id !== appId) {
          throw new Error(`An app with the name '${appName}' already exists`);
        }

        if (pathConflict && pathConflict.id !== appId) {
          throw new Error(`An app with the path '${appPath}' already exists`);
        }

        // Stop the app if it's running
        if (runningApps.has(appId)) {
          const appInfo = runningApps.get(appId)!;
          try {
            await killProcess(appInfo.process);
            runningApps.delete(appId);
          } catch (error: any) {
            logger.error(`Error stopping app ${appId} before renaming:`, error);
            throw new Error(
              `Failed to stop app before renaming: ${error.message}`,
            );
          }
        }

        const oldAppPath = getDyadAppPath(app.path);
        const newAppPath = getDyadAppPath(appPath);
        // Only move files if needed
        if (newAppPath !== oldAppPath) {
          // Move app files
          try {
            // Check if destination directory already exists
            if (fs.existsSync(newAppPath)) {
              throw new Error(
                `Destination path '${newAppPath}' already exists`,
              );
            }

            // Create parent directory if it doesn't exist
            await fsPromises.mkdir(path.dirname(newAppPath), {
              recursive: true,
            });

            // Copy the directory without node_modules
            await copyDir(oldAppPath, newAppPath);
          } catch (error: any) {
            logger.error(
              `Error moving app files from ${oldAppPath} to ${newAppPath}:`,
              error,
            );
            throw new Error(`Failed to move app files: ${error.message}`);
          }

          try {
            // Delete the old directory
            await fsPromises.rm(oldAppPath, { recursive: true, force: true });
          } catch (error: any) {
            // Why is this just a warning? This happens quite often on Windows
            // because it has an aggressive file lock.
            //
            // Not deleting the old directory is annoying, but not a big deal
            // since the user can do it themselves if they need to.
            logger.warn(
              `Error deleting old app directory ${oldAppPath}:`,
              error,
            );
          }
        }

        // Update app in database
        try {
          await db
            .update(apps)
            .set({
              name: appName,
              path: appPath,
            })
            .where(eq(apps.id, appId))
            .returning();

          return;
        } catch (error: any) {
          // Attempt to rollback the file move
          if (newAppPath !== oldAppPath) {
            try {
              // Copy back from new to old
              await copyDir(newAppPath, oldAppPath);
              // Delete the new directory
              await fsPromises.rm(newAppPath, { recursive: true, force: true });
            } catch (rollbackError) {
              logger.error(
                `Failed to rollback file move during rename error:`,
                rollbackError,
              );
            }
          }

          logger.error(`Error updating app ${appId} in database:`, error);
          throw new Error(`Failed to update app in database: ${error.message}`);
        }
      });
    },
  );

  ipcMain.handle("reset-all", async (): Promise<void> => {
    logger.log("start: resetting all apps and settings.");
    // Stop all running apps first
    logger.log("stopping all running apps...");
    const runningAppIds = Array.from(runningApps.keys());
    for (const appId of runningAppIds) {
      try {
        const appInfo = runningApps.get(appId)!;
        await killProcess(appInfo.process);
        runningApps.delete(appId);
      } catch (error) {
        logger.error(`Error stopping app ${appId} during reset:`, error);
        // Continue with reset even if stopping fails
      }
    }
    logger.log("all running apps stopped.");
    logger.log("deleting database...");
    // 1. Drop the database by deleting the SQLite file
    const dbPath = getDatabasePath();
    if (fs.existsSync(dbPath)) {
      // Close database connections first
      if (db.$client) {
        db.$client.close();
      }
      await fsPromises.unlink(dbPath);
      logger.log(`Database file deleted: ${dbPath}`);
    }
    logger.log("database deleted.");
    logger.log("deleting settings...");
    // 2. Remove settings
    const userDataPath = getUserDataPath();
    const settingsPath = path.join(userDataPath, "user-settings.json");

    if (fs.existsSync(settingsPath)) {
      await fsPromises.unlink(settingsPath);
      logger.log(`Settings file deleted: ${settingsPath}`);
    }
    logger.log("settings deleted.");
    // 3. Remove all app files recursively
    // Doing this last because it's the most time-consuming and the least important
    // in terms of resetting the app state.
    logger.log("removing all app files...");
    const dyadAppPath = getDyadAppPath(".");
    if (fs.existsSync(dyadAppPath)) {
      await fsPromises.rm(dyadAppPath, { recursive: true, force: true });
      // Recreate the base directory
      await fsPromises.mkdir(dyadAppPath, { recursive: true });
    }
    logger.log("all app files removed.");
    logger.log("reset all complete.");
  });

  ipcMain.handle("get-app-version", async (): Promise<{ version: string }> => {
    // Read version from package.json at project root
    const packageJsonPath = path.resolve(__dirname, "..", "..", "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    return { version: packageJson.version };
  });

  handle("rename-branch", async (_, params: RenameBranchParams) => {
    const { appId, oldBranchName, newBranchName } = params;
    const app = await db.query.apps.findFirst({
      where: eq(apps.id, appId),
    });

    if (!app) {
      throw new Error("App not found");
    }

    const appPath = getDyadAppPath(app.path);

    return withLock(appId, async () => {
      try {
        // Check if the old branch exists
        const branches = await git.listBranches({ fs, dir: appPath });
        if (!branches.includes(oldBranchName)) {
          throw new Error(`Branch '${oldBranchName}' not found.`);
        }

        // Check if the new branch name already exists
        if (branches.includes(newBranchName)) {
          // If newBranchName is 'main' and oldBranchName is 'master',
          // and 'main' already exists, we might want to allow this if 'main' is the current branch
          // and just switch to it, or delete 'master'.
          // For now, let's keep it simple and throw an error.
          throw new Error(
            `Branch '${newBranchName}' already exists. Cannot rename.`,
          );
        }

        await git.renameBranch({
          fs: fs,
          dir: appPath,
          oldref: oldBranchName,
          ref: newBranchName,
        });
        logger.info(
          `Branch renamed from '${oldBranchName}' to '${newBranchName}' for app ${appId}`,
        );
      } catch (error: any) {
        logger.error(
          `Failed to rename branch for app ${appId}: ${error.message}`,
        );
        throw new Error(
          `Failed to rename branch '${oldBranchName}' to '${newBranchName}': ${error.message}`,
        );
      }
    });
  });

  ipcMain.handle(
    "search-files",
    async (_event, { pattern }: { pattern: string }) => {
      const workspaceRoot = process.cwd();
      // Use glob to find files matching the pattern
      return glob.sync(pattern, { cwd: workspaceRoot, nodir: true });
    },
  );

  ipcMain.handle("list-files", async (_event, { dir }: { dir: string }) => {
    const workspaceRoot = process.cwd();
    const pathMod = require("path");
    const fs = require("fs");
    const fullDir = pathMod.resolve(workspaceRoot, dir);
    if (!fullDir.startsWith(workspaceRoot)) {
      throw new Error("Invalid directory path");
    }
    try {
      return fs.readdirSync(fullDir);
    } catch {
      throw new Error("Failed to list files");
    }
  });

  ipcMain.handle(
    "search-file-content",
    async (_event, { path, query }: { path: string; query: string }) => {
      const workspaceRoot = process.cwd();
      const pathMod = require("path");
      const fs = require("fs");
      const fullPath = pathMod.resolve(workspaceRoot, path);
      if (!fullPath.startsWith(workspaceRoot)) {
        throw new Error("Invalid file path");
      }
      try {
        const content = fs.readFileSync(fullPath, "utf-8");
        const lines = content.split("\n");
        const lowerQuery = query.toLowerCase();
        return lines
          .map((lineContent: string, idx: number) => ({
            line: idx + 1,
            content: lineContent,
          }))
          .filter((obj: { line: number; content: string }) =>
            obj.content.toLowerCase().includes(lowerQuery),
          );
      } catch {
        throw new Error("Failed to search file content");
      }
    },
  );

  ipcMain.handle(
    "move-file",
    async (_event, { from, to }: { from: string; to: string }) => {
      const workspaceRoot = process.cwd();
      const pathMod = require("path");
      const fs = require("fs");
      const fromPath = pathMod.resolve(workspaceRoot, from);
      const toPath = pathMod.resolve(workspaceRoot, to);
      if (
        !fromPath.startsWith(workspaceRoot) ||
        !toPath.startsWith(workspaceRoot)
      ) {
        throw new Error("Invalid file path");
      }
      try {
        // Ensure target directory exists
        const dirPath = pathMod.dirname(toPath);
        fs.mkdirSync(dirPath, { recursive: true });
        fs.renameSync(fromPath, toPath);
        return;
      } catch {
        throw new Error("Failed to move file");
      }
    },
  );

  ipcMain.handle("open-in-vscode", async () => {
    const workspaceRoot = process.cwd();
    let command, args;
    if (process.platform === "win32") {
      command = "cmd";
      args = ["/c", "code", "."];
    } else if (process.platform === "darwin") {
      // Try CLI first, fallback to open -a
      command = "code";
      args = ["."];
    } else {
      command = "code";
      args = ["."];
    }
    try {
      const child = spawn(command, args, {
        cwd: workspaceRoot,
        detached: true,
        stdio: "ignore",
      });
      child.unref();
      return;
    } catch {
      // Try fallback for macOS if CLI fails
      if (process.platform === "darwin") {
        try {
          spawn("open", ["-a", "Visual Studio Code", workspaceRoot], {
            detached: true,
            stdio: "ignore",
          }).unref();
          return;
        } catch {}
      }
      throw new Error(
        "Failed to open VSCode. Is it installed and on your PATH?",
      );
    }
  });

  // Register Dyad file/dir operation handlers
  ipcMain.handle("dyad:copyfile", async (_event, { from, to }) => {
    try {
      await fse.copy(from, to, { overwrite: true, errorOnExist: false });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
  ipcMain.handle("dyad:copydir", async (_event, { from, to }) => {
    try {
      await fse.copy(from, to, { overwrite: true, errorOnExist: false });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
  ipcMain.handle("dyad:mkdir", async (_event, { path }) => {
    try {
      await fsPromises.mkdir(path, { recursive: true });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
  ipcMain.handle("dyad:deletedir", async (_event, { path }) => {
    try {
      await fse.remove(path);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
  // Dyad file content tools
  ipcMain.handle("dyad:appendfile", async (_event, { path, content }) => {
    try {
      const workspaceRoot = process.cwd();
      const fullPath = require("path").resolve(workspaceRoot, path);
      if (!fullPath.startsWith(workspaceRoot)) {
        throw new Error("Invalid file path");
      }
      await fsPromises.appendFile(fullPath, content, "utf-8");
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
  ipcMain.handle("dyad:prependfile", async (_event, { path, content }) => {
    try {
      const workspaceRoot = process.cwd();
      const fullPath = require("path").resolve(workspaceRoot, path);
      if (!fullPath.startsWith(workspaceRoot)) {
        throw new Error("Invalid file path");
      }
      let original = "";
      try {
        original = await fsPromises.readFile(fullPath, "utf-8");
      } catch {
        // If file does not exist, treat as empty
      }
      await fsPromises.writeFile(fullPath, content + original, "utf-8");
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
  ipcMain.handle(
    "dyad:replacefile",
    async (_event, { path, search, replace }) => {
      try {
        const workspaceRoot = process.cwd();
        const fullPath = require("path").resolve(workspaceRoot, path);
        if (!fullPath.startsWith(workspaceRoot)) {
          throw new Error("Invalid file path");
        }
        let original = await fsPromises.readFile(fullPath, "utf-8");
        // Replace all occurrences (simple global string replace)
        const replaced = original.split(search).join(replace);
        await fsPromises.writeFile(fullPath, replaced, "utf-8");
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  );
  // Dyad git tools
  const { exec } = require("child_process");
  function runGitCommand(
    args: string,
    opts: Record<string, any> = {},
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      exec(
        args,
        { cwd: process.cwd(), ...opts },
        (error: any, stdout: string, stderr: string) => {
          if (error) {
            reject(stderr || error.message);
          } else {
            resolve(stdout);
          }
        },
      );
    });
  }
  ipcMain.handle("dyad:gitstatus", async () => {
    try {
      const status = await runGitCommand("git status --short --branch");
      return { success: true, status };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
  ipcMain.handle("dyad:gitdiff", async (_event, { path }) => {
    try {
      const diff = await runGitCommand(
        path ? `git diff -- ${path}` : "git diff",
      );
      return { success: true, diff };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
  ipcMain.handle("dyad:gitlog", async (_event, { count }) => {
    try {
      const log = await runGitCommand(
        `git log -n ${parseInt(count, 10) || 5} --oneline --decorate --graph --all`,
      );
      return { success: true, log };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
  // Dyad dependency management tools
  const fsDep = require("fs");
  const pathDep = require("path");
  ipcMain.handle("dyad:listdeps", async () => {
    try {
      const pkgPath = pathDep.join(process.cwd(), "package.json");
      if (!fsDep.existsSync(pkgPath)) {
        throw new Error("package.json not found");
      }
      const pkg = JSON.parse(fsDep.readFileSync(pkgPath, "utf-8"));
      const deps = [
        ...Object.keys(pkg.dependencies || {}),
        ...Object.keys(pkg.devDependencies || {}),
      ];
      return { success: true, deps };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
  ipcMain.handle("dyad:updatedep", async (_event, { package: pkg }) => {
    try {
      if (!pkg) throw new Error("No package specified");
      const { exec } = require("child_process");
      await new Promise((resolve, reject) => {
        exec(
          `npm install ${pkg}@latest`,
          { cwd: process.cwd() },
          (error: any, stdout: string, stderr: string) => {
            if (error) {
              reject(stderr || error.message);
            } else {
              resolve(stdout);
            }
          },
        );
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
  // Dyad code intelligence tools
  const fsCI = require("fs");
  const pathCI = require("path");
  function getAllSourceFiles(
    exts: string[] = [".ts", ".tsx", ".js", ".jsx"],
  ): string[] {
    function walk(dir: string): string[] {
      let results: string[] = [];
      const list = fsCI.readdirSync(dir);
      for (const file of list) {
        const filePath = pathCI.join(dir, file);
        const stat = fsCI.statSync(filePath);
        if (stat && stat.isDirectory()) {
          results = results.concat(walk(filePath));
        } else if (exts.includes(pathCI.extname(file))) {
          results.push(filePath);
        }
      }
      return results;
    }
    return walk(process.cwd());
  }
  ipcMain.handle(
    "dyad:findrefs",
    async (_event, { symbol }: { symbol: string }) => {
      try {
        if (!symbol) throw new Error("No symbol specified");
        const files = getAllSourceFiles();
        const refs: string[] = [];
        for (const file of files) {
          const content = fsCI.readFileSync(file, "utf-8");
          const lines = content.split("\n");
          lines.forEach((line: string, idx: number) => {
            if (line.includes(symbol)) {
              refs.push(`${file}:${idx + 1}: ${line.trim()}`);
            }
          });
        }
        return { success: true, refs };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  );
  ipcMain.handle(
    "dyad:finddef",
    async (_event, { symbol }: { symbol: string }) => {
      try {
        if (!symbol) throw new Error("No symbol specified");
        const files = getAllSourceFiles();
        for (const file of files) {
          const content = fsCI.readFileSync(file, "utf-8");
          const lines = content.split("\n");
          for (let idx = 0; idx < lines.length; idx++) {
            const line = lines[idx];
            if (
              line.match(
                new RegExp(`(function|class|const|let|var)\\s+${symbol}\\b`),
              )
            ) {
              return {
                success: true,
                def: `${file}:${idx + 1}: ${line.trim()}`,
              };
            }
          }
        }
        return { success: false, error: "Definition not found" };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  );
  ipcMain.handle("dyad:showexports", async (_event, { path }) => {
    try {
      if (!path) throw new Error("No file path specified");
      const fullPath = pathCI.resolve(process.cwd(), path);
      if (!fsCI.existsSync(fullPath)) throw new Error("File not found");
      const content = fsCI.readFileSync(fullPath, "utf-8");
      const exportRegex =
        /export\s+(?:const|function|class|let|var|default|type|interface|enum)\s+([\w$]+)/g;
      const exports = [];
      let match;
      while ((match = exportRegex.exec(content)) !== null) {
        exports.push(match[1]);
      }
      return { success: true, exports };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
  ipcMain.handle("dyad:showimports", async (_event, { path }) => {
    try {
      if (!path) throw new Error("No file path specified");
      const fullPath = pathCI.resolve(process.cwd(), path);
      if (!fsCI.existsSync(fullPath)) throw new Error("File not found");
      const content = fsCI.readFileSync(fullPath, "utf-8");
      const importRegex =
        /import\s+(?:[\w${},* ]+\s+from\s+)?["']([^"']+)["']/g;
      const imports = [];
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        imports.push(match[1]);
      }
      return { success: true, imports };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
}

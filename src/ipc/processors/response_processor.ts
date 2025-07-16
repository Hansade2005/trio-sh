import { db } from "../../db";
import { chats, messages } from "../../db/schema";
import { and, eq } from "drizzle-orm";
import fs from "node:fs";
import { getDyadAppPath } from "../../paths/paths";
import path from "node:path";
import git from "isomorphic-git";
import { safeJoin } from "../utils/path_utils";

import log from "electron-log";
import { executeAddDependency } from "./executeAddDependency";
import {
  deleteSupabaseFunction,
  deploySupabaseFunctions,
  executeSupabaseSql,
} from "../../supabase_admin/supabase_management_client";
import { isServerFunction } from "../../supabase_admin/supabase_utils";
import { SqlQuery, UserSettings } from "../../lib/schemas";
import { gitCommit } from "../utils/git_utils";
import { readSettings } from "@/main/settings";
import { writeMigrationFile } from "../utils/file_utils";
import { normalizePath } from "./normalizePath";

const readFile = fs.promises.readFile;
const logger = log.scope("response_processor");

export function getDyadWriteTags(fullResponse: string): {
  path: string;
  content: string;
  description?: string;
}[] {
  const dyadWriteRegex = /<dyad-write([^>]*)>([\s\S]*?)<\/dyad-write>/gi;
  const pathRegex = /path="([^"]+)"/;
  const descriptionRegex = /description="([^"]+)"/;

  let match;
  const tags: { path: string; content: string; description?: string }[] = [];

  while ((match = dyadWriteRegex.exec(fullResponse)) !== null) {
    const attributesString = match[1];
    let content = match[2].trim();

    const pathMatch = pathRegex.exec(attributesString);
    const descriptionMatch = descriptionRegex.exec(attributesString);

    if (pathMatch && pathMatch[1]) {
      const path = pathMatch[1];
      const description = descriptionMatch?.[1];

      const contentLines = content.split("\n");
      if (contentLines[0]?.startsWith("```")) {
        contentLines.shift();
      }
      if (contentLines[contentLines.length - 1]?.startsWith("```")) {
        contentLines.pop();
      }
      content = contentLines.join("\n");

      tags.push({ path: normalizePath(path), content, description });
    } else {
      logger.warn(
        "Found <dyad-write> tag without a valid 'path' attribute:",
        match[0],
      );
    }
  }
  return tags;
}

export function getDyadRenameTags(fullResponse: string): {
  from: string;
  to: string;
}[] {
  const dyadRenameRegex =
    /<dyad-rename from="([^"]+)" to="([^"]+)"[^>]*>([\s\S]*?)<\/dyad-rename>/g;
  let match;
  const tags: { from: string; to: string }[] = [];
  while ((match = dyadRenameRegex.exec(fullResponse)) !== null) {
    tags.push({
      from: normalizePath(match[1]),
      to: normalizePath(match[2]),
    });
  }
  return tags;
}

export function getDyadDeleteTags(fullResponse: string): string[] {
  const dyadDeleteRegex =
    /<dyad-delete path="([^"]+)"[^>]*>([\s\S]*?)<\/dyad-delete>/g;
  let match;
  const paths: string[] = [];
  while ((match = dyadDeleteRegex.exec(fullResponse)) !== null) {
    paths.push(normalizePath(match[1]));
  }
  return paths;
}

export function getDyadAddDependencyTags(fullResponse: string): string[] {
  const dyadAddDependencyRegex =
    /<dyad-add-dependency packages="([^"]+)">[^<]*<\/dyad-add-dependency>/g;
  let match;
  const packages: string[] = [];
  while ((match = dyadAddDependencyRegex.exec(fullResponse)) !== null) {
    packages.push(...match[1].split(" "));
  }
  return packages;
}

export function getDyadChatSummaryTag(fullResponse: string): string | null {
  const dyadChatSummaryRegex =
    /<dyad-chat-summary>([\s\S]*?)<\/dyad-chat-summary>/g;
  const match = dyadChatSummaryRegex.exec(fullResponse);
  if (match && match[1]) {
    return match[1].trim();
  }
  return null;
}

export function getDyadExecuteSqlTags(fullResponse: string): SqlQuery[] {
  const dyadExecuteSqlRegex =
    /<dyad-execute-sql([^>]*)>([\s\S]*?)<\/dyad-execute-sql>/g;
  const descriptionRegex = /description="([^"]+)"/;
  let match;
  const queries: { content: string; description?: string }[] = [];

  while ((match = dyadExecuteSqlRegex.exec(fullResponse)) !== null) {
    const attributesString = match[1] || "";
    let content = match[2].trim();
    const descriptionMatch = descriptionRegex.exec(attributesString);
    const description = descriptionMatch?.[1];

    // Handle markdown code blocks if present
    const contentLines = content.split("\n");
    if (contentLines[0]?.startsWith("```")) {
      contentLines.shift();
    }
    if (contentLines[contentLines.length - 1]?.startsWith("```")) {
      contentLines.pop();
    }
    content = contentLines.join("\n");

    queries.push({ content, description });
  }

  return queries;
}

export function getDyadCommandTags(fullResponse: string): string[] {
  const dyadCommandRegex =
    /<dyad-command type="([^"]+)"[^>]*><\/dyad-command>/g;
  let match;
  const commands: string[] = [];

  while ((match = dyadCommandRegex.exec(fullResponse)) !== null) {
    commands.push(match[1]);
  }

  return commands;
}

interface Output {
  message: string;
  error: unknown;
}

function getFunctionNameFromPath(input: string): string {
  return path.basename(path.extname(input) ? path.dirname(input) : input);
}

async function readFileFromFunctionPath(input: string): Promise<string> {
  // Sometimes, the path given is a directory, sometimes it's the file itself.
  if (path.extname(input) === "") {
    return readFile(path.join(input, "index.ts"), "utf8");
  }
  return readFile(input, "utf8");
}

export async function processFullResponseActions(
  fullResponse: string,
  chatId: number,
  {
    chatSummary,
    messageId,
  }: { chatSummary: string | undefined; messageId: number },
): Promise<{
  updatedFiles?: boolean;
  error?: string;
  extraFiles?: string[];
  extraFilesError?: string;
  readResults?: Record<string, any>; // <-- Added
}> {
  logger.log("processFullResponseActions for chatId", chatId);
  // Get the app associated with the chat
  const chatWithApp = await db.query.chats.findFirst({
    where: eq(chats.id, chatId),
    with: {
      app: true,
    },
  });
  if (!chatWithApp || !chatWithApp.app) {
    logger.error(`No app found for chat ID: ${chatId}`);
    return {};
  }

  const settings: UserSettings = readSettings();
  const appPath = getDyadAppPath(chatWithApp.app.path);
  const writtenFiles: string[] = [];
  const renamedFiles: string[] = [];
  const deletedFiles: string[] = [];
  let hasChanges = false;

  const warnings: Output[] = [];
  const errors: Output[] = [];

  try {
    // Extract all tags
    const dyadWriteTags = getDyadWriteTags(fullResponse);
    const dyadRenameTags = getDyadRenameTags(fullResponse);
    const dyadDeletePaths = getDyadDeleteTags(fullResponse);
    const dyadAddDependencyPackages = getDyadAddDependencyTags(fullResponse);
    const dyadExecuteSqlQueries = chatWithApp.app.supabaseProjectId
      ? getDyadExecuteSqlTags(fullResponse)
      : [];
    let writtenSqlMigrationFiles = 0;

    const message = await db.query.messages.findFirst({
      where: and(
        eq(messages.id, messageId),
        eq(messages.role, "assistant"),
        eq(messages.chatId, chatId),
      ),
    });

    if (!message) {
      logger.error(`No message found for ID: ${messageId}`);
      return {};
    }

    // Handle SQL execution tags
    if (dyadExecuteSqlQueries.length > 0) {
      for (const query of dyadExecuteSqlQueries) {
        try {
          await executeSupabaseSql({
            supabaseProjectId: chatWithApp.app.supabaseProjectId!,
            query: query.content,
          });

          // Only write migration file if SQL execution succeeded
          if (settings.enableSupabaseWriteSqlMigration) {
            try {
              await writeMigrationFile(
                appPath,
                query.content,
                query.description,
              );
              writtenSqlMigrationFiles++;
            } catch (error) {
              errors.push({
                message: `Failed to write SQL migration file for: ${query.description}`,
                error: error,
              });
            }
          }
        } catch (error) {
          errors.push({
            message: `Failed to execute SQL query: ${query.content}`,
            error: error,
          });
        }
      }
      logger.log(`Executed ${dyadExecuteSqlQueries.length} SQL queries`);
    }

    // TODO: Handle add dependency tags
    if (dyadAddDependencyPackages.length > 0) {
      try {
        await executeAddDependency({
          packages: dyadAddDependencyPackages,
          message: message,
          appPath,
        });
      } catch (error) {
        errors.push({
          message: `Failed to add dependencies: ${dyadAddDependencyPackages.join(
            ", ",
          )}`,
          error: error,
        });
      }
      writtenFiles.push("package.json");
      const pnpmFilename = "pnpm-lock.yaml";
      if (fs.existsSync(safeJoin(appPath, pnpmFilename))) {
        writtenFiles.push(pnpmFilename);
      }
      const packageLockFilename = "package-lock.json";
      if (fs.existsSync(safeJoin(appPath, packageLockFilename))) {
        writtenFiles.push(packageLockFilename);
      }
    }

    //////////////////////
    // File operations //
    // Do it in this order:
    // 1. Deletes
    // 2. Renames
    // 3. Writes
    //
    // Why?
    // - Deleting first avoids path conflicts before the other operations.
    // - LLMs like to rename and then edit the same file.
    //////////////////////

    // Process all file deletions
    for (const filePath of dyadDeletePaths) {
      const fullFilePath = safeJoin(appPath, filePath);

      // Delete the file if it exists
      if (fs.existsSync(fullFilePath)) {
        if (fs.lstatSync(fullFilePath).isDirectory()) {
          fs.rmdirSync(fullFilePath, { recursive: true });
        } else {
          fs.unlinkSync(fullFilePath);
        }
        logger.log(`Successfully deleted file: ${fullFilePath}`);
        deletedFiles.push(filePath);

        // Remove the file from git
        try {
          await git.remove({
            fs,
            dir: appPath,
            filepath: filePath,
          });
        } catch (error) {
          logger.warn(`Failed to git remove deleted file ${filePath}:`, error);
          // Continue even if remove fails as the file was still deleted
        }
      } else {
        logger.warn(`File to delete does not exist: ${fullFilePath}`);
      }
      if (isServerFunction(filePath)) {
        try {
          await deleteSupabaseFunction({
            supabaseProjectId: chatWithApp.app.supabaseProjectId!,
            functionName: getFunctionNameFromPath(filePath),
          });
        } catch (error) {
          errors.push({
            message: `Failed to delete Supabase function: ${filePath}`,
            error: error,
          });
        }
      }
    }

    // Process all file renames
    for (const tag of dyadRenameTags) {
      const fromPath = safeJoin(appPath, tag.from);
      const toPath = safeJoin(appPath, tag.to);

      // Ensure target directory exists
      const dirPath = path.dirname(toPath);
      fs.mkdirSync(dirPath, { recursive: true });

      // Rename the file
      if (fs.existsSync(fromPath)) {
        fs.renameSync(fromPath, toPath);
        logger.log(`Successfully renamed file: ${fromPath} -> ${toPath}`);
        renamedFiles.push(tag.to);

        // Add the new file and remove the old one from git
        await git.add({
          fs,
          dir: appPath,
          filepath: tag.to,
        });
        try {
          await git.remove({
            fs,
            dir: appPath,
            filepath: tag.from,
          });
        } catch (error) {
          logger.warn(`Failed to git remove old file ${tag.from}:`, error);
          // Continue even if remove fails as the file was still renamed
        }
      } else {
        logger.warn(`Source file for rename does not exist: ${fromPath}`);
      }
      if (isServerFunction(tag.from)) {
        try {
          await deleteSupabaseFunction({
            supabaseProjectId: chatWithApp.app.supabaseProjectId!,
            functionName: getFunctionNameFromPath(tag.from),
          });
        } catch (error) {
          warnings.push({
            message: `Failed to delete Supabase function: ${tag.from} as part of renaming ${tag.from} to ${tag.to}`,
            error: error,
          });
        }
      }
      if (isServerFunction(tag.to)) {
        try {
          await deploySupabaseFunctions({
            supabaseProjectId: chatWithApp.app.supabaseProjectId!,
            functionName: getFunctionNameFromPath(tag.to),
            content: await readFileFromFunctionPath(toPath),
          });
        } catch (error) {
          errors.push({
            message: `Failed to deploy Supabase function: ${tag.to} as part of renaming ${tag.from} to ${tag.to}`,
            error: error,
          });
        }
      }
    }

    // Process all file writes
    for (const tag of dyadWriteTags) {
      const filePath = tag.path;
      const content = tag.content;
      const fullFilePath = safeJoin(appPath, filePath);

      // Ensure directory exists
      const dirPath = path.dirname(fullFilePath);
      fs.mkdirSync(dirPath, { recursive: true });

      // Write file content
      fs.writeFileSync(fullFilePath, content);
      logger.log(`Successfully wrote file: ${fullFilePath}`);
      writtenFiles.push(filePath);
      if (isServerFunction(filePath)) {
        try {
          await deploySupabaseFunctions({
            supabaseProjectId: chatWithApp.app.supabaseProjectId!,
            functionName: path.basename(path.dirname(filePath)),
            content: content,
          });
        } catch (error) {
          errors.push({
            message: `Failed to deploy Supabase function: ${filePath}`,
            error: error,
          });
        }
      }
    }

    // --- Begin: New Dyad Tag Batch Processing ---
    const readResults: Record<string, any> = {};
    // 1. Read single file
    for (const tag of getDyadReadFileTags(fullResponse)) {
      try {
        const filePath = safeJoin(appPath, tag.path);
        if (!filePath.startsWith(appPath)) throw new Error("Invalid file path");
        readResults[`readfile:${tag.path}`] = fs.readFileSync(
          filePath,
          "utf-8",
        );
      } catch (error) {
        errors.push({ message: `Failed to read file: ${tag.path}`, error });
      }
    }
    // 2. Read multiple files
    for (const tag of getDyadReadFilesTags(fullResponse)) {
      readResults[`readfiles:${tag.paths.join(",")}`] = [];
      for (const p of tag.paths) {
        try {
          const filePath = safeJoin(appPath, p);
          if (!filePath.startsWith(appPath))
            throw new Error("Invalid file path");
          readResults[`readfiles:${tag.paths.join(",")}`].push({
            path: p,
            content: fs.readFileSync(filePath, "utf-8"),
          });
        } catch (error) {
          errors.push({ message: `Failed to read file: ${p}`, error });
        }
      }
    }
    // 3. List files in directory
    for (const tag of getDyadListFilesTags(fullResponse)) {
      try {
        const dirPath = safeJoin(appPath, tag.dir);
        if (!dirPath.startsWith(appPath)) throw new Error("Invalid dir path");
        readResults[`listfiles:${tag.dir}`] = fs.readdirSync(dirPath);
      } catch (error) {
        errors.push({
          message: `Failed to list files in dir: ${tag.dir}`,
          error,
        });
      }
    }
    // 4. Search files by pattern (simple glob)
    for (const tag of getDyadSearchFilesTags(fullResponse)) {
      try {
        const glob = require("glob");
        readResults[`searchfiles:${tag.pattern}`] = glob.sync(tag.pattern, {
          cwd: appPath,
          absolute: false,
        });
      } catch (error) {
        errors.push({
          message: `Failed to search files: ${tag.pattern}`,
          error,
        });
      }
    }
    // 5. Search file content
    for (const tag of getDyadSearchFileContentTags(fullResponse)) {
      try {
        const filePath = safeJoin(appPath, tag.path);
        if (!filePath.startsWith(appPath)) throw new Error("Invalid file path");
        const content = fs.readFileSync(filePath, "utf-8");
        const lines = content.split("\n");
        readResults[`searchfilecontent:${tag.path}:${tag.query}`] =
          lines.filter((l) => l.includes(tag.query));
      } catch (error) {
        errors.push({
          message: `Failed to search file content: ${tag.path}`,
          error,
        });
      }
    }
    // 6. Move files
    for (const tag of getDyadMoveFileTags(fullResponse)) {
      try {
        const fromPath = safeJoin(appPath, tag.from);
        const toPath = safeJoin(appPath, tag.to);
        if (!fromPath.startsWith(appPath) || !toPath.startsWith(appPath))
          throw new Error("Invalid file path");
        fs.renameSync(fromPath, toPath);
      } catch (error) {
        errors.push({
          message: `Failed to move file: ${tag.from} -> ${tag.to}`,
          error,
        });
      }
    }
    // 7. Copy files
    for (const tag of getDyadCopyFileTags(fullResponse)) {
      try {
        const fromPath = safeJoin(appPath, tag.from);
        const toPath = safeJoin(appPath, tag.to);
        if (!fromPath.startsWith(appPath) || !toPath.startsWith(appPath))
          throw new Error("Invalid file path");
        fs.copyFileSync(fromPath, toPath);
      } catch (error) {
        errors.push({
          message: `Failed to copy file: ${tag.from} -> ${tag.to}`,
          error,
        });
      }
    }
    // 8. Copy directories
    for (const tag of getDyadCopyDirTags(fullResponse)) {
      try {
        const fse = require("fs-extra");
        const fromPath = safeJoin(appPath, tag.from);
        const toPath = safeJoin(appPath, tag.to);
        if (!fromPath.startsWith(appPath) || !toPath.startsWith(appPath))
          throw new Error("Invalid dir path");
        fse.copySync(fromPath, toPath);
      } catch (error) {
        errors.push({
          message: `Failed to copy dir: ${tag.from} -> ${tag.to}`,
          error,
        });
      }
    }
    // 9. Make directories
    for (const tag of getDyadMkdirTags(fullResponse)) {
      try {
        const dirPath = safeJoin(appPath, tag.path);
        if (!dirPath.startsWith(appPath)) throw new Error("Invalid dir path");
        fs.mkdirSync(dirPath, { recursive: true });
      } catch (error) {
        errors.push({ message: `Failed to mkdir: ${tag.path}`, error });
      }
    }
    // 10. Append to files
    for (const tag of getDyadAppendFileTags(fullResponse)) {
      try {
        const filePath = safeJoin(appPath, tag.path);
        if (!filePath.startsWith(appPath)) throw new Error("Invalid file path");
        fs.appendFileSync(filePath, tag.content, "utf-8");
      } catch (error) {
        errors.push({ message: `Failed to append file: ${tag.path}`, error });
      }
    }
    // 11. Prepend to files
    for (const tag of getDyadPrependFileTags(fullResponse)) {
      try {
        const filePath = safeJoin(appPath, tag.path);
        if (!filePath.startsWith(appPath)) throw new Error("Invalid file path");
        let original = "";
        try {
          original = fs.readFileSync(filePath, "utf-8");
        } catch {}
        fs.writeFileSync(filePath, tag.content + original, "utf-8");
      } catch (error) {
        errors.push({ message: `Failed to prepend file: ${tag.path}`, error });
      }
    }
    // 12. Replace in files
    for (const tag of getDyadReplaceFileTags(fullResponse)) {
      try {
        const filePath = safeJoin(appPath, tag.path);
        if (!filePath.startsWith(appPath)) throw new Error("Invalid file path");
        let original = fs.readFileSync(filePath, "utf-8");
        const replaced = original.split(tag.search).join(tag.replace);
        fs.writeFileSync(filePath, replaced, "utf-8");
      } catch (error) {
        errors.push({
          message: `Failed to replace in file: ${tag.path}`,
          error,
        });
      }
    }
    // 13. Git status
    if (getDyadGitStatusTags(fullResponse)) {
      try {
        const { execSync } = require("child_process");
        readResults["gitstatus"] = execSync("git status --short --branch", {
          cwd: appPath,
        }).toString();
      } catch (error) {
        errors.push({ message: `Failed to get git status`, error });
      }
    }
    // 14. Git diff
    for (const tag of getDyadGitDiffTags(fullResponse)) {
      try {
        const { execSync } = require("child_process");
        const cmd = tag.path ? `git diff -- ${tag.path}` : "git diff";
        readResults[`gitdiff${tag.path ? ":" + tag.path : ""}`] = execSync(
          cmd,
          { cwd: appPath },
        ).toString();
      } catch (error) {
        errors.push({
          message: `Failed to get git diff${tag.path ? ": " + tag.path : ""}`,
          error,
        });
      }
    }
    // 15. Git log
    for (const tag of getDyadGitLogTags(fullResponse)) {
      try {
        const { execSync } = require("child_process");
        const count = tag.count || 5;
        readResults[`gitlog:${count}`] = execSync(
          `git log -n ${count} --oneline --decorate --graph --all`,
          { cwd: appPath },
        ).toString();
      } catch (error) {
        errors.push({ message: `Failed to get git log`, error });
      }
    }
    // 16. List dependencies
    if (getDyadListDepsTags(fullResponse)) {
      try {
        const pkgPath = path.join(appPath, "package.json");
        if (!fs.existsSync(pkgPath)) throw new Error("package.json not found");
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
        readResults["listdeps"] = [
          ...Object.keys(pkg.dependencies || {}),
          ...Object.keys(pkg.devDependencies || {}),
        ];
      } catch (error) {
        errors.push({ message: `Failed to list dependencies`, error });
      }
    }
    // 17. Update dependency
    for (const tag of getDyadUpdateDepTags(fullResponse)) {
      try {
        const { execSync } = require("child_process");
        execSync(`npm install ${tag.package}@latest`, { cwd: appPath });
      } catch (error) {
        errors.push({
          message: `Failed to update dependency: ${tag.package}`,
          error,
        });
      }
    }
    // --- End: New Dyad Tag Batch Processing ---

    // If we have any file changes, commit them all at once
    hasChanges =
      writtenFiles.length > 0 ||
      renamedFiles.length > 0 ||
      deletedFiles.length > 0 ||
      dyadAddDependencyPackages.length > 0 ||
      writtenSqlMigrationFiles > 0;

    let uncommittedFiles: string[] = [];
    let extraFilesError: string | undefined;

    if (hasChanges) {
      // Stage all written files
      for (const file of writtenFiles) {
        await git.add({
          fs,
          dir: appPath,
          filepath: file,
        });
      }

      // Create commit with details of all changes
      const changes = [];
      if (writtenFiles.length > 0)
        changes.push(`wrote ${writtenFiles.length} file(s)`);
      if (renamedFiles.length > 0)
        changes.push(`renamed ${renamedFiles.length} file(s)`);
      if (deletedFiles.length > 0)
        changes.push(`deleted ${deletedFiles.length} file(s)`);
      if (dyadAddDependencyPackages.length > 0)
        changes.push(
          `added ${dyadAddDependencyPackages.join(", ")} package(s)`,
        );
      if (dyadExecuteSqlQueries.length > 0)
        changes.push(`executed ${dyadExecuteSqlQueries.length} SQL queries`);

      let message = chatSummary
        ? `[dyad] ${chatSummary} - ${changes.join(", ")}`
        : `[dyad] ${changes.join(", ")}`;
      // Use chat summary, if provided, or default for commit message
      let commitHash = await gitCommit({
        path: appPath,
        message,
      });
      logger.log(`Successfully committed changes: ${changes.join(", ")}`);

      // Check for any uncommitted changes after the commit
      const statusMatrix = await git.statusMatrix({ fs, dir: appPath });
      uncommittedFiles = statusMatrix
        .filter((row) => row[1] !== 1 || row[2] !== 1 || row[3] !== 1)
        .map((row) => row[0]); // Get just the file paths

      if (uncommittedFiles.length > 0) {
        // Stage all changes
        await git.add({
          fs,
          dir: appPath,
          filepath: ".",
        });
        try {
          commitHash = await gitCommit({
            path: appPath,
            message: message + " + extra files edited outside of Dyad",
            amend: true,
          });
          logger.log(
            `Amend commit with changes outside of dyad: ${uncommittedFiles.join(", ")}`,
          );
        } catch (error) {
          // Just log, but don't throw an error because the user can still
          // commit these changes outside of Dyad if needed.
          logger.error(
            `Failed to commit changes outside of dyad: ${uncommittedFiles.join(
              ", ",
            )}`,
          );
          extraFilesError = (error as any).toString();
        }
      }

      // Save the commit hash to the message
      await db
        .update(messages)
        .set({
          commitHash: commitHash,
        })
        .where(eq(messages.id, messageId));
    }
    logger.log("mark as approved: hasChanges", hasChanges);
    // Update the message to approved
    await db
      .update(messages)
      .set({
        approvalState: "approved",
      })
      .where(eq(messages.id, messageId));

    return {
      updatedFiles: hasChanges,
      extraFiles: uncommittedFiles.length > 0 ? uncommittedFiles : undefined,
      extraFilesError,
      readResults, // <-- Added
    };
  } catch (error: unknown) {
    logger.error("Error processing files:", error);
    return { error: (error as any).toString() };
  } finally {
    const appendedContent = `
    ${warnings
      .map(
        (warning) =>
          `<dyad-output type="warning" message="${warning.message}">${warning.error}</dyad-output>`,
      )
      .join("\n")}
    ${errors
      .map(
        (error) =>
          `<dyad-output type="error" message="${error.message}">${error.error}</dyad-output>`,
      )
      .join("\n")}
    `;
    if (appendedContent.length > 0) {
      await db
        .update(messages)
        .set({
          content: fullResponse + "\n\n" + appendedContent,
        })
        .where(eq(messages.id, messageId));
    }
  }
}

// --- New Dyad Tag Extraction Utilities ---

export function getDyadReadFileTags(fullResponse: string): { path: string }[] {
  const regex = /<dyad-readfile path="([^"]+)"><\/dyad-readfile>/g;
  let match;
  const tags: { path: string }[] = [];
  while ((match = regex.exec(fullResponse)) !== null) {
    tags.push({ path: normalizePath(match[1]) });
  }
  return tags;
}

export function getDyadReadFilesTags(
  fullResponse: string,
): { paths: string[] }[] {
  const regex = /<dyad-readfiles paths="([^"]+)"><\/dyad-readfiles>/g;
  let match;
  const tags: { paths: string[] }[] = [];
  while ((match = regex.exec(fullResponse)) !== null) {
    tags.push({
      paths: match[1].split(",").map((p) => normalizePath(p.trim())),
    });
  }
  return tags;
}

export function getDyadSearchFilesTags(
  fullResponse: string,
): { pattern: string }[] {
  const regex = /<dyad-searchfiles pattern="([^"]+)"><\/dyad-searchfiles>/g;
  let match;
  const tags: { pattern: string }[] = [];
  while ((match = regex.exec(fullResponse)) !== null) {
    tags.push({ pattern: match[1] });
  }
  return tags;
}

export function getDyadListFilesTags(fullResponse: string): { dir: string }[] {
  const regex = /<dyad-listfiles dir="([^"]+)"><\/dyad-listfiles>/g;
  let match;
  const tags: { dir: string }[] = [];
  while ((match = regex.exec(fullResponse)) !== null) {
    tags.push({ dir: normalizePath(match[1]) });
  }
  return tags;
}

export function getDyadSearchFileContentTags(
  fullResponse: string,
): { path: string; query: string }[] {
  const regex =
    /<dyad-searchfilecontent path="([^"]+)" query="([^"]+)"><\/dyad-searchfilecontent>/g;
  let match;
  const tags: { path: string; query: string }[] = [];
  while ((match = regex.exec(fullResponse)) !== null) {
    tags.push({ path: normalizePath(match[1]), query: match[2] });
  }
  return tags;
}

export function getDyadMoveFileTags(
  fullResponse: string,
): { from: string; to: string }[] {
  const regex = /<dyad-movefile from="([^"]+)" to="([^"]+)"><\/dyad-movefile>/g;
  let match;
  const tags: { from: string; to: string }[] = [];
  while ((match = regex.exec(fullResponse)) !== null) {
    tags.push({ from: normalizePath(match[1]), to: normalizePath(match[2]) });
  }
  return tags;
}

export function getDyadCopyFileTags(
  fullResponse: string,
): { from: string; to: string }[] {
  const regex = /<dyad-copyfile from="([^"]+)" to="([^"]+)"><\/dyad-copyfile>/g;
  let match;
  const tags: { from: string; to: string }[] = [];
  while ((match = regex.exec(fullResponse)) !== null) {
    tags.push({ from: normalizePath(match[1]), to: normalizePath(match[2]) });
  }
  return tags;
}

export function getDyadCopyDirTags(
  fullResponse: string,
): { from: string; to: string }[] {
  const regex = /<dyad-copydir from="([^"]+)" to="([^"]+)"><\/dyad-copydir>/g;
  let match;
  const tags: { from: string; to: string }[] = [];
  while ((match = regex.exec(fullResponse)) !== null) {
    tags.push({ from: normalizePath(match[1]), to: normalizePath(match[2]) });
  }
  return tags;
}

export function getDyadMkdirTags(fullResponse: string): { path: string }[] {
  const regex = /<dyad-mkdir path="([^"]+)"><\/dyad-mkdir>/g;
  let match;
  const tags: { path: string }[] = [];
  while ((match = regex.exec(fullResponse)) !== null) {
    tags.push({ path: normalizePath(match[1]) });
  }
  return tags;
}

export function getDyadAppendFileTags(
  fullResponse: string,
): { path: string; content: string }[] {
  const regex =
    /<dyad-appendfile path="([^"]+)">([\s\S]*?)<\/dyad-appendfile>/g;
  let match;
  const tags: { path: string; content: string }[] = [];
  while ((match = regex.exec(fullResponse)) !== null) {
    tags.push({ path: normalizePath(match[1]), content: match[2] });
  }
  return tags;
}

export function getDyadPrependFileTags(
  fullResponse: string,
): { path: string; content: string }[] {
  const regex =
    /<dyad-prependfile path="([^"]+)">([\s\S]*?)<\/dyad-prependfile>/g;
  let match;
  const tags: { path: string; content: string }[] = [];
  while ((match = regex.exec(fullResponse)) !== null) {
    tags.push({ path: normalizePath(match[1]), content: match[2] });
  }
  return tags;
}

export function getDyadReplaceFileTags(
  fullResponse: string,
): { path: string; search: string; replace: string }[] {
  const regex =
    /<dyad-replacefile path="([^"]+)" search="([^"]+)" replace="([^"]+)"><\/dyad-replacefile>/g;
  let match;
  const tags: { path: string; search: string; replace: string }[] = [];
  while ((match = regex.exec(fullResponse)) !== null) {
    tags.push({
      path: normalizePath(match[1]),
      search: match[2],
      replace: match[3],
    });
  }
  return tags;
}

export function getDyadGitStatusTags(fullResponse: string): boolean {
  return /<dyad-gitstatus><\/dyad-gitstatus>/g.test(fullResponse);
}

export function getDyadGitDiffTags(fullResponse: string): { path?: string }[] {
  const regex = /<dyad-gitdiff(?: path="([^"]+)")?><\/dyad-gitdiff>/g;
  let match;
  const tags: { path?: string }[] = [];
  while ((match = regex.exec(fullResponse)) !== null) {
    tags.push({ path: match[1] ? normalizePath(match[1]) : undefined });
  }
  return tags;
}

export function getDyadGitLogTags(fullResponse: string): { count?: number }[] {
  const regex = /<dyad-gitlog(?: count="(\d+)")?><\/dyad-gitlog>/g;
  let match;
  const tags: { count?: number }[] = [];
  while ((match = regex.exec(fullResponse)) !== null) {
    tags.push({ count: match[1] ? parseInt(match[1], 10) : undefined });
  }
  return tags;
}

export function getDyadFindRefsTags(
  fullResponse: string,
): { symbol: string }[] {
  const regex = /<dyad-findrefs symbol="([^"]+)"><\/dyad-findrefs>/g;
  let match;
  const tags: { symbol: string }[] = [];
  while ((match = regex.exec(fullResponse)) !== null) {
    tags.push({ symbol: match[1] });
  }
  return tags;
}

export function getDyadFindDefTags(fullResponse: string): { symbol: string }[] {
  const regex = /<dyad-finddef symbol="([^"]+)"><\/dyad-finddef>/g;
  let match;
  const tags: { symbol: string }[] = [];
  while ((match = regex.exec(fullResponse)) !== null) {
    tags.push({ symbol: match[1] });
  }
  return tags;
}

export function getDyadShowExportsTags(
  fullResponse: string,
): { path: string }[] {
  const regex = /<dyad-showexports path="([^"]+)"><\/dyad-showexports>/g;
  let match;
  const tags: { path: string }[] = [];
  while ((match = regex.exec(fullResponse)) !== null) {
    tags.push({ path: normalizePath(match[1]) });
  }
  return tags;
}

export function getDyadShowImportsTags(
  fullResponse: string,
): { path: string }[] {
  const regex = /<dyad-showimports path="([^"]+)"><\/dyad-showimports>/g;
  let match;
  const tags: { path: string }[] = [];
  while ((match = regex.exec(fullResponse)) !== null) {
    tags.push({ path: normalizePath(match[1]) });
  }
  return tags;
}

export function getDyadListDepsTags(fullResponse: string): boolean {
  return /<dyad-listdeps><\/dyad-listdeps>/g.test(fullResponse);
}

export function getDyadUpdateDepTags(
  fullResponse: string,
): { package: string }[] {
  const regex = /<dyad-updatedep package="([^"]+)"><\/dyad-updatedep>/g;
  let match;
  const tags: { package: string }[] = [];
  while ((match = regex.exec(fullResponse)) !== null) {
    tags.push({ package: match[1] });
  }
  return tags;
}

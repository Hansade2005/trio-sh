import { createLoggedHandler } from "./safe_handle";
import fs from "fs/promises";
import path from "path";
import log from "electron-log";
import { exec } from "child_process";
import util from "util";
import fetch from "node-fetch";

const execAsync = util.promisify(exec);

const logger = log.scope("read_file_handlers");
const handle = createLoggedHandler(logger);

export function registerReadFileHandlers() {
  handle("read-file", async (_event, { path }) => {
    if (!path) throw new Error("No path provided");
    const content = await fs.readFile(path, "utf8");
    return { content };
  });
  handle("read-files", async (_event, { paths }) => {
    if (!Array.isArray(paths) || paths.length === 0 || paths.length > 3) {
      throw new Error("You must provide 1-3 file paths");
    }
    const results: Record<string, string> = {};
    for (const p of paths) {
      results[p] = await fs.readFile(p, "utf8");
    }
    return results;
  });
}

export function registerMoveFileHandler() {
  handle("move-file", async (_event, { from, to }) => {
    if (!from || !to)
      throw new Error("Both 'from' and 'to' paths are required");
    // Ensure the destination directory exists
    await fs.mkdir(path.dirname(to), { recursive: true });
    await fs.rename(from, to);
    return { success: true };
  });
}

export function registerCopyFileHandler() {
  handle("copy-file", async (_event, { from, to }) => {
    if (!from || !to)
      throw new Error("Both 'from' and 'to' paths are required");
    await fs.mkdir(path.dirname(to), { recursive: true });
    await fs.copyFile(from, to);
    return { success: true };
  });
}

export function registerMkdirHandler() {
  handle("mkdir", async (_event, { path: dirPath }) => {
    if (!dirPath) throw new Error("'path' is required");
    await fs.mkdir(dirPath, { recursive: true });
    return { success: true };
  });
}

export function registerSearchHandler() {
  handle("search", async (_event, { query, dir }) => {
    if (!query) throw new Error("'query' is required");
    const searchDir = dir || process.cwd();
    const results: any[] = [];
    const walk = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else {
          const content = await fs.readFile(fullPath, "utf8");
          const lines = content.split("\n");
          lines.forEach((line, idx) => {
            if (line.includes(query)) {
              results.push({ file: fullPath, line: idx + 1, text: line });
            }
          });
        }
      }
    };
    await walk(searchDir);
    return results;
  });
}

export function registerReplaceHandler() {
  handle("replace", async (_event, { query, replace, files }) => {
    if (!query || !replace || !files)
      throw new Error("'query', 'replace', and 'files' are required");
    const fileList = files.split(",").map((f: string) => f.trim());
    for (const file of fileList) {
      let content = await fs.readFile(file, "utf8");
      content = content.split(query).join(replace);
      await fs.writeFile(file, content, "utf8");
    }
    return { success: true };
  });
}

export function registerRunScriptHandler() {
  handle("run-script", async (_event, { script }) => {
    if (!script) throw new Error("'script' is required");
    const { stdout, stderr } = await execAsync(`npm run ${script}`);
    return { stdout, stderr };
  });
}

export function registerFormatHandler() {
  handle("format", async (_event, { path: target }) => {
    if (!target) throw new Error("'path' is required");
    const { stdout, stderr } = await execAsync(
      `npx prettier --write ${target}`,
    );
    return { stdout, stderr };
  });
}

export function registerLintHandler() {
  handle("lint", async (_event, { path: target }) => {
    if (!target) throw new Error("'path' is required");
    const { stdout, stderr } = await execAsync(`npx eslint ${target}`);
    return { stdout, stderr };
  });
}

export function registerTestHandler() {
  handle("test", async (_event, { path: target }) => {
    const cmd = target ? `npm test -- ${target}` : `npm test`;
    const { stdout, stderr } = await execAsync(cmd);
    return { stdout, stderr };
  });
}

export function registerGitHandler() {
  handle("git", async (_event, { command }) => {
    if (!command) throw new Error("'command' is required");
    const { stdout, stderr } = await execAsync(`git ${command}`);
    return { stdout, stderr };
  });
}

export function registerDownloadHandler() {
  handle("download", async (_event, { url, to }) => {
    if (!url || !to) throw new Error("'url' and 'to' are required");
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to download: ${res.statusText}`);
    const buffer = await res.buffer();
    await fs.mkdir(path.dirname(to), { recursive: true });
    await fs.writeFile(to, buffer);
    return { success: true };
  });
}

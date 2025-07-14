import { createLoggedHandler } from "./safe_handle";
import fs from "fs/promises";
import log from "electron-log";

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
    const results = {};
    for (const p of paths) {
      results[p] = await fs.readFile(p, "utf8");
    }
    return results;
  });
} 
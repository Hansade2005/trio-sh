import { ipcMain } from "electron";
import { spawn } from "child_process";

export function registerMCPInstallHandlers() {
  ipcMain.handle("mcp:install-server", async (_event, { command, args }) => {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, { shell: true });
      let output = "";
      let error = "";

      proc.stdout.on("data", (data) => {
        output += data.toString();
      });
      proc.stderr.on("data", (data) => {
        error += data.toString();
      });

      proc.on("close", (code) => {
        if (code === 0) resolve({ success: true, output });
        else reject({ success: false, error, code });
      });
      proc.on("error", (err) => {
        reject({ success: false, error: err.message });
      });
    });
  });

  ipcMain.on("mcp:install-server-stream", (event, { command, args }) => {
    const proc = spawn(command, args, { shell: true });
    let output = "";
    let error = "";

    proc.stdout.on("data", (data) => {
      const msg = data.toString();
      output += msg;
      event.sender.send("mcp:install-server-log", {
        type: "stdout",
        message: msg,
      });
    });
    proc.stderr.on("data", (data) => {
      const msg = data.toString();
      error += msg;
      event.sender.send("mcp:install-server-log", {
        type: "stderr",
        message: msg,
      });
    });

    proc.on("close", (code) => {
      event.sender.send("mcp:install-server-log", {
        type: code === 0 ? "done" : "error",
        message: code === 0 ? output : error,
        code,
      });
    });
    proc.on("error", (err) => {
      event.sender.send("mcp:install-server-log", {
        type: "error",
        message: err.message,
      });
    });
  });
}

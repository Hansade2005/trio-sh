import { ipcMain, WebContents } from "electron";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import os from "os";

// Map from sender id to shell process
const shellProcesses: Map<number, ChildProcessWithoutNullStreams> = new Map();

function getShellCommand() {
  if (process.platform === "win32") {
    // Prefer PowerShell if available, else cmd.exe
    return process.env.ComSpec || "cmd.exe";
  } else {
    // Prefer bash, else zsh, else sh
    if (process.env.SHELL) return process.env.SHELL;
    return "/bin/bash";
  }
}

export function registerTerminalHandlers() {
  ipcMain.handle("terminal:start", (event, { cwd } = {}) => {
    const senderId = event.sender.id;
    if (shellProcesses.has(senderId)) {
      // Already running
      return { success: false, error: "Terminal already running" };
    }
    const shell = getShellCommand();
    const proc = spawn(shell, [], {
      stdio: "pipe",
      env: process.env,
      cwd: cwd || process.cwd(),
    });
    shellProcesses.set(senderId, proc);

    // Stream stdout
    proc.stdout.on("data", (data) => {
      event.sender.send("terminal:onData", { type: "stdout", data: data.toString() });
    });
    // Stream stderr
    proc.stderr.on("data", (data) => {
      event.sender.send("terminal:onData", { type: "stderr", data: data.toString() });
    });
    // On exit
    proc.on("exit", (code, signal) => {
      event.sender.send("terminal:onData", { type: "exit", code, signal });
      shellProcesses.delete(senderId);
    });
    return { success: true };
  });

  ipcMain.handle("terminal:input", (event, { input }) => {
    const senderId = event.sender.id;
    const proc = shellProcesses.get(senderId);
    if (!proc) return { success: false, error: "No terminal running" };
    proc.stdin.write(input);
    return { success: true };
  });

  ipcMain.handle("terminal:stop", (event) => {
    const senderId = event.sender.id;
    const proc = shellProcesses.get(senderId);
    if (!proc) return { success: false, error: "No terminal running" };
    proc.kill();
    shellProcesses.delete(senderId);
    return { success: true };
  });
} 
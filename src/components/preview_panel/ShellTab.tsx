import { useEffect, useRef, useState } from "react";
import { IpcClient } from "@/ipc/ipc_client";
import { Terminal } from "xterm";
import "xterm/css/xterm.css";

export function ShellTab() {
  const xtermRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const term = new Terminal({
      fontSize: 13,
      theme: {
        background: '#18181b',
        foreground: '#e5e7eb',
      },
      cursorBlink: true,
      rows: 20,
    });
    termRef.current = term;
    if (xtermRef.current) {
      term.open(xtermRef.current);
    }
    let unsub: (() => void) | undefined;
    let started = false;
    IpcClient.getInstance().startTerminal().then((res) => {
      if (!res.success) {
        setError(res.error || "Failed to start terminal");
        return;
      }
      started = true;
      unsub = IpcClient.getInstance().onTerminalData((data) => {
        if (data.type === "stdout" || data.type === "stderr") {
          term.write(data.data || "");
        } else if (data.type === "exit") {
          term.write(`\r\n[Process exited with code ${data.code}]\r\n`);
        }
      });
    });
    // Send user input to backend
    term.onData((input) => {
      IpcClient.getInstance().sendTerminalInput(input);
    });
    return () => {
      if (started) {
        IpcClient.getInstance().stopTerminal();
      }
      if (unsub) unsub();
      term.dispose();
    };
  }, []);

  if (error) {
    return <div className="flex flex-col h-full items-center justify-center text-red-500">{error}</div>;
  }
  return (
    <div className="flex flex-col h-full bg-black">
      <div ref={xtermRef} className="flex-1 w-full h-full" />
    </div>
  );
} 
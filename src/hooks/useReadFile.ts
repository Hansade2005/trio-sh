import { useState, useEffect } from "react";
import { IpcClient } from "@/ipc/ipc_client";

export function useReadFile(path: string | null) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadFile = async () => {
      if (!path) {
        setContent(null);
        setError(null);
        return;
      }
      setLoading(true);
      try {
        const ipcClient = IpcClient.getInstance();
        const fileContent = await ipcClient.readFile(path);
        setContent(fileContent);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setContent(null);
      } finally {
        setLoading(false);
      }
    };
    loadFile();
  }, [path]);

  return { content, loading, error };
} 
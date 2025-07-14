import { useState, useEffect } from "react";
import { IpcClient } from "@/ipc/ipc_client";

export function useReadFiles(paths: string[]) {
  const [contents, setContents] = useState<Record<string, { line: number, content: string }[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadFiles = async () => {
      if (!paths || paths.length === 0) {
        setContents({});
        setError({});
        return;
      }
      setLoading(true);
      try {
        const ipcClient = IpcClient.getInstance();
        const result = await ipcClient.readFiles(paths);
        setContents(result.contents || {});
        setError(result.error || {});
      } catch (err) {
        // If the whole call fails, set all errors
        const errMsg = err instanceof Error ? err.message : String(err);
        setContents({});
        setError(Object.fromEntries(paths.map(p => [p, errMsg])));
      } finally {
        setLoading(false);
      }
    };
    loadFiles();
  }, [JSON.stringify(paths)]);

  return { contents, loading, error };
} 
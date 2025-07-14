import { useState, useEffect } from "react";
import { IpcClient } from "@/ipc/ipc_client";

export function useListFiles(dir: string) {
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!dir) {
      setFiles([]);
      setError(null);
      return;
    }
    setLoading(true);
    IpcClient.getInstance()
      .listFiles(dir)
      .then(setFiles)
      .catch((err) => setError(err instanceof Error ? err : new Error(String(err))))
      .finally(() => setLoading(false));
  }, [dir]);

  return { files, loading, error };
} 
import { useState, useEffect } from "react";
import { IpcClient } from "@/ipc/ipc_client";

export function useSearchFiles(pattern: string) {
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!pattern) {
      setFiles([]);
      setError(null);
      return;
    }
    setLoading(true);
    IpcClient.getInstance()
      .searchFiles(pattern)
      .then(setFiles)
      .catch((err) => setError(err instanceof Error ? err : new Error(String(err))))
      .finally(() => setLoading(false));
  }, [pattern]);

  return { files, loading, error };
} 
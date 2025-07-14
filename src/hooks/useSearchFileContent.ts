import { useState, useEffect } from "react";
import { IpcClient } from "@/ipc/ipc_client";

export function useSearchFileContent(path: string, query: string) {
  const [results, setResults] = useState<{ line: number, content: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!path || !query) {
      setResults([]);
      setError(null);
      return;
    }
    setLoading(true);
    IpcClient.getInstance()
      .searchFileContent(path, query)
      .then(setResults)
      .catch((err) => setError(err instanceof Error ? err : new Error(String(err))))
      .finally(() => setLoading(false));
  }, [path, query]);

  return { results, loading, error };
} 
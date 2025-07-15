import { useQuery } from "@tanstack/react-query";
import { IpcClient } from "@/ipc/ipc_client";

export function useGitDiff({ path }: { path?: string }) {
  return useQuery({
    queryKey: ["git-diff", path],
    queryFn: async () => {
      const ipcClient = IpcClient.getInstance();
      return ipcClient.gitDiff(path);
    },
    enabled: path !== undefined || path === "",
  });
} 
import { useQuery } from "@tanstack/react-query";
import { IpcClient } from "@/ipc/ipc_client";

export function useGitLog({ count }: { count: number }) {
  return useQuery({
    queryKey: ["git-log", count],
    queryFn: async () => {
      const ipcClient = IpcClient.getInstance();
      return ipcClient.gitLog(count);
    },
  });
} 
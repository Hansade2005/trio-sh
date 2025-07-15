import { useQuery } from "@tanstack/react-query";
import { IpcClient } from "@/ipc/ipc_client";

export function useGitStatus() {
  return useQuery({
    queryKey: ["git-status"],
    queryFn: async () => {
      const ipcClient = IpcClient.getInstance();
      return ipcClient.gitStatus();
    },
  });
} 
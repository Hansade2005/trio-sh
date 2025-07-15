import { useMutation } from "@tanstack/react-query";
import { IpcClient } from "@/ipc/ipc_client";

export function useReplaceFile() {
  return useMutation({
    mutationFn: async ({ path, search, replace }: { path: string; search: string; replace: string }) => {
      const ipcClient = IpcClient.getInstance();
      return ipcClient.replaceFile(path, search, replace);
    },
  });
} 
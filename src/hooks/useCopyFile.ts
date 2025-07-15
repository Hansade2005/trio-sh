import { useMutation } from "@tanstack/react-query";
import { IpcClient } from "@/ipc/ipc_client";

export function useCopyFile() {
  return useMutation({
    mutationFn: async ({ from, to }: { from: string; to: string }) => {
      const ipcClient = IpcClient.getInstance();
      return ipcClient.copyFile(from, to);
    },
  });
} 
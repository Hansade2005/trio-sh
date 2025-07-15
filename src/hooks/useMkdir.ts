import { useMutation } from "@tanstack/react-query";
import { IpcClient } from "@/ipc/ipc_client";

export function useMkdir() {
  return useMutation({
    mutationFn: async ({ path }: { path: string }) => {
      const ipcClient = IpcClient.getInstance();
      return ipcClient.mkdir(path);
    },
  });
} 
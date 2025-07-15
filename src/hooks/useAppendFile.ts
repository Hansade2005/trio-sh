import { useMutation } from "@tanstack/react-query";
import { IpcClient } from "@/ipc/ipc_client";

export function useAppendFile() {
  return useMutation({
    mutationFn: async ({ path, content }: { path: string; content: string }) => {
      const ipcClient = IpcClient.getInstance();
      return ipcClient.appendFile(path, content);
    },
  });
} 
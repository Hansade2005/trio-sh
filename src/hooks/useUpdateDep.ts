import { useMutation } from "@tanstack/react-query";
import { IpcClient } from "@/ipc/ipc_client";

export function useUpdateDep() {
  return useMutation({
    mutationFn: async ({ package: pkg }: { package: string }) => {
      const ipcClient = IpcClient.getInstance();
      return ipcClient.updateDep(pkg);
    },
  });
} 
import { useQuery } from "@tanstack/react-query";
import { IpcClient } from "@/ipc/ipc_client";

export function useListDeps() {
  return useQuery({
    queryKey: ["list-deps"],
    queryFn: async () => {
      const ipcClient = IpcClient.getInstance();
      return ipcClient.listDeps();
    },
  });
} 
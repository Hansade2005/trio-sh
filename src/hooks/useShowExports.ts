import { useQuery } from "@tanstack/react-query";
import { IpcClient } from "@/ipc/ipc_client";

export function useShowExports({ path }: { path: string }) {
  return useQuery({
    queryKey: ["show-exports", path],
    queryFn: async () => {
      const ipcClient = IpcClient.getInstance();
      return ipcClient.showExports(path);
    },
    enabled: !!path,
  });
} 
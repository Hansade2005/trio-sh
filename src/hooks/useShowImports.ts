import { useQuery } from "@tanstack/react-query";
import { IpcClient } from "@/ipc/ipc_client";

export function useShowImports({ path }: { path: string }) {
  return useQuery({
    queryKey: ["show-imports", path],
    queryFn: async () => {
      const ipcClient = IpcClient.getInstance();
      return ipcClient.showImports(path);
    },
    enabled: !!path,
  });
} 
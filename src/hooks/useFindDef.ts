import { useQuery } from "@tanstack/react-query";
import { IpcClient } from "@/ipc/ipc_client";

export function useFindDef({ symbol }: { symbol: string }) {
  return useQuery({
    queryKey: ["find-def", symbol],
    queryFn: async () => {
      const ipcClient = IpcClient.getInstance();
      return ipcClient.findDef(symbol);
    },
    enabled: !!symbol,
  });
} 
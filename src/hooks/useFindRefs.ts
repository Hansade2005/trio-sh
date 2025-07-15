import { useQuery } from "@tanstack/react-query";
import { IpcClient } from "@/ipc/ipc_client";

export function useFindRefs({ symbol }: { symbol: string }) {
  return useQuery({
    queryKey: ["find-refs", symbol],
    queryFn: async () => {
      const ipcClient = IpcClient.getInstance();
      return ipcClient.findRefs(symbol);
    },
    enabled: !!symbol,
  });
} 
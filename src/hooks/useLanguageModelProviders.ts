import { useQuery } from "@tanstack/react-query";
import { IpcClient } from "@/ipc/ipc_client";
import type { LanguageModelProvider } from "@/ipc/ipc_types";
import { useSettings } from "./useSettings";
import { getProviderApiKey } from "@/ipc/utils/get_model_client";
import { cloudProviders } from "@/lib/schemas";

export function useLanguageModelProviders() {
  const ipcClient = IpcClient.getInstance();
  const { settings, envVars } = useSettings();

  const queryResult = useQuery<LanguageModelProvider[], Error>({
    queryKey: ["languageModelProviders"],
    queryFn: async () => {
      return ipcClient.getLanguageModelProviders();
    },
  });

  const isProviderSetup = (provider: string) => {
    const providerSettings = settings?.providerSettings[provider];
    if (queryResult.isLoading) {
      return false;
    }
    // Use type guards before accessing .apiKey or .auto on providerSettings.
    // Example:
    // if (providerSettings && 'auto' in providerSettings && providerSettings.auto && 'apiKey' in providerSettings.auto) { ... }
    if (
      providerSettings &&
      typeof providerSettings.auto === 'object' &&
      providerSettings.auto !== null &&
      'apiKey' in providerSettings.auto
    ) {
      const apiKeyValue = (providerSettings.auto as { apiKey?: { value: string } }).apiKey?.value;
      if (apiKeyValue) {
        return true;
      }
    }
    const providerData = queryResult.data?.find((p) => p.id === provider);
    if (providerData?.envVarName && envVars[providerData.envVarName]) {
      return true;
    }
    return false;
  };

  const isAnyProviderSetup = () => {
    return cloudProviders.some((provider) => isProviderSetup(provider));
  };

  return {
    ...queryResult,
    isProviderSetup,
    isAnyProviderSetup,
  };
}

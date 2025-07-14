import { useState, useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { useLanguageModelProviders } from "@/hooks/useLanguageModelProviders";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {} from "@/components/ui/accordion";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { showError } from "@/lib/toast";
import { UserSettings } from "@/lib/schemas";

import { ProviderSettingsHeader } from "./ProviderSettingsHeader";
import { ApiKeyConfiguration } from "./ApiKeyConfiguration";
import { ModelsSection } from "./ModelsSection";
import React from "react";

interface ProviderSettingsPageProps {
  provider: string;
}

// Type guard for MCP settings
function isMcpSettings(obj: any): obj is {
  transportType: "sse" | "stdio";
  sseUrl?: string;
  stdioCommand?: string;
  stdioArgs?: string[];
  apiBaseUrl?: { value: string };
} {
  return obj && typeof obj === "object" && "transportType" in obj;
}

// MCP Env Editor component
function MCPEnvEditor({
  env,
  onChange,
}: {
  env: Record<string, string>;
  onChange: (env: Record<string, string>) => void;
}) {
  const [editing, setEditing] = React.useState<{
    key: string;
    value: string;
  } | null>(null);
  const [newKey, setNewKey] = React.useState("");
  const [newValue, setNewValue] = React.useState("");
  return (
    <div className="mt-2">
      <label className="block text-sm font-medium mb-2">
        Environment Variables
      </label>
      <div className="space-y-2">
        {Object.entries(env).map(([key, value]) => (
          <div key={key} className="flex gap-2 items-center">
            {editing && editing.key === key ? (
              <>
                <input
                  className="input flex-1"
                  value={editing.key}
                  onChange={(e) =>
                    setEditing({ ...editing, key: e.target.value })
                  }
                  placeholder="KEY"
                />
                <input
                  className="input flex-1"
                  value={editing.value}
                  onChange={(e) =>
                    setEditing({ ...editing, value: e.target.value })
                  }
                  placeholder="VALUE"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    const newEnv = { ...env };
                    delete newEnv[key];
                    if (editing.key) newEnv[editing.key] = editing.value;
                    setEditing(null);
                    onChange(newEnv);
                  }}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                  {key}
                </span>
                <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                  {value}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditing({ key, value })}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    const newEnv = { ...env };
                    delete newEnv[key];
                    onChange(newEnv);
                  }}
                >
                  Delete
                </Button>
              </>
            )}
          </div>
        ))}
        <div className="flex gap-2 items-center mt-2">
          <input
            className="input flex-1"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="KEY"
          />
          <input
            className="input flex-1"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="VALUE"
          />
          <Button
            size="sm"
            onClick={() => {
              if (!newKey) return;
              onChange({ ...env, [newKey]: newValue });
              setNewKey("");
              setNewValue("");
            }}
          >
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ProviderSettingsPage({ provider }: ProviderSettingsPageProps) {
  const {
    settings,
    envVars,
    loading: settingsLoading,
    error: settingsError,
    updateSettings,
  } = useSettings();

  // Fetch all providers
  const {
    data: allProviders,
    isLoading: providersLoading,
    error: providersError,
  } = useLanguageModelProviders();

  // Find the specific provider data from the fetched list
  const providerData = allProviders?.find((p) => p.id === provider);
  const supportsCustomModels =
    providerData?.type === "custom" || providerData?.type === "cloud";

  const isDyad = provider === "auto";

  // --- State for MCP fields ---
  const mcpSettings = settings?.providerSettings?.mcp;
  const mcpTransportType = isMcpSettings(mcpSettings)
    ? mcpSettings.transportType
    : "sse";
  const mcpSseUrl = isMcpSettings(mcpSettings)
    ? (mcpSettings.sseUrl ?? mcpSettings.apiBaseUrl?.value ?? "")
    : ((mcpSettings as any)?.apiBaseUrl?.value ?? "");
  const mcpStdioCommand = isMcpSettings(mcpSettings)
    ? (mcpSettings.stdioCommand ?? "")
    : "";
  const mcpStdioArgs = isMcpSettings(mcpSettings)
    ? (mcpSettings.stdioArgs ?? [])
    : [];

  const [apiKeyInput, setApiKeyInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [mcpUrlInput, setMcpUrlInput] = useState(mcpSseUrl);
  const [isSavingMcpUrl, setIsSavingMcpUrl] = useState(false);
  const [mcpUrlError, setMcpUrlError] = useState<string | null>(null);
  const router = useRouter();

  // Use fetched data (or defaults for Trio)
  const providerDisplayName = isDyad
    ? "Trio"
    : (providerData?.name ?? "Unknown Provider");
  const providerWebsiteUrl = isDyad
    ? "https://academy.triobuilder.cc/settings"
    : providerData?.websiteUrl;
  const hasFreeTier = isDyad ? false : providerData?.hasFreeTier;
  const envVarName = isDyad ? undefined : providerData?.envVarName;

  // Use provider ID (which is the 'provider' prop)
  const userApiKey =
    provider !== "mcp" &&
    settings?.providerSettings?.[provider] &&
    "apiKey" in settings.providerSettings[provider]
      ? (settings.providerSettings[provider] as any)?.apiKey?.value
      : undefined;

  // --- Configuration Logic --- Updated Priority ---
  const isValidUserKey =
    !!userApiKey &&
    !userApiKey.startsWith("Invalid Key") &&
    userApiKey !== "Not Set";
  const hasEnvKey = !!(envVarName && envVars[envVarName]);

  const isConfigured = isValidUserKey || hasEnvKey; // Configured if either is set

  // --- Save Handler ---
  const handleSaveKey = async () => {
    if (!apiKeyInput) {
      setSaveError("API Key cannot be empty.");
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      const settingsUpdate: Partial<UserSettings> = {
        providerSettings: {
          ...settings?.providerSettings,
          [provider]: {
            ...settings?.providerSettings?.[provider],
            apiKey: {
              value: apiKeyInput,
            },
          },
        },
      };
      if (isDyad) {
        settingsUpdate.enableDyadPro = true;
      }
      await updateSettings(settingsUpdate);
      setApiKeyInput(""); // Clear input on success
      // Optionally show a success message
    } catch (error: any) {
      console.error("Error saving API key:", error);
      setSaveError(error.message || "Failed to save API key.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- Delete Handler ---
  const handleDeleteKey = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await updateSettings({
        providerSettings: {
          ...settings?.providerSettings,
          [provider]: {
            ...settings?.providerSettings?.[provider],
            apiKey: undefined,
          },
        },
      });
      // Optionally show a success message
    } catch (error: any) {
      console.error("Error deleting API key:", error);
      setSaveError(error.message || "Failed to delete API key.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- Toggle Dyad Pro Handler ---
  const handleToggleDyadPro = async (enabled: boolean) => {
    setIsSaving(true);
    try {
      await updateSettings({
        enableDyadPro: enabled,
      });
    } catch (error: any) {
      showError(`Error toggling Dyad Pro: ${error}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveMcpUrl = async () => {
    if (!mcpUrlInput) {
      setMcpUrlError("MCP server URL cannot be empty.");
      return;
    }
    setIsSavingMcpUrl(true);
    setMcpUrlError(null);
    try {
      await updateSettings({
        providerSettings: {
          ...settings?.providerSettings,
          mcp: isMcpSettings(settings?.providerSettings?.mcp)
            ? {
                ...settings?.providerSettings?.mcp,
                sseUrl: mcpUrlInput,
                apiBaseUrl: { value: mcpUrlInput }, // for legacy fallback
              }
            : {
                transportType: "sse",
                sseUrl: mcpUrlInput,
                apiBaseUrl: { value: mcpUrlInput },
              },
        },
      });
    } catch (error: any) {
      setMcpUrlError(error.message || "Failed to save MCP server URL.");
    } finally {
      setIsSavingMcpUrl(false);
    }
  };

  // Effect to clear input error when input changes
  useEffect(() => {
    if (saveError) {
      setSaveError(null);
    }
  }, [apiKeyInput]);

  // --- Loading State for Providers ---
  if (providersLoading) {
    return (
      <div className="min-h-screen px-8 py-4">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-8 w-24 mb-4" />
          <Skeleton className="h-10 w-1/2 mb-6" />
          <Skeleton className="h-10 w-48 mb-4" />
          <div className="space-y-4 mt-6">
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // --- Error State for Providers ---
  if (providersError) {
    return (
      <div className="min-h-screen px-8 py-4">
        <div className="max-w-4xl mx-auto">
          <Button
            onClick={() => router.history.back()}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 mb-4 bg-(--background-lightest) py-5"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mr-3 mb-6">
            Configure Provider
          </h1>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error Loading Provider Details</AlertTitle>
            <AlertDescription>
              Could not load provider data: {providersError.message}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Handle case where provider is not found (e.g., invalid ID in URL)
  if (!providerData && !isDyad) {
    return (
      <div className="min-h-screen px-8 py-4">
        <div className="max-w-4xl mx-auto">
          <Button
            onClick={() => router.history.back()}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 mb-4 bg-(--background-lightest) py-5"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mr-3 mb-6">
            Provider Not Found
          </h1>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              The provider with ID "{provider}" could not be found.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-8 py-4">
      <div className="max-w-4xl mx-auto">
        <ProviderSettingsHeader
          providerDisplayName={providerDisplayName}
          isConfigured={isConfigured}
          isLoading={settingsLoading}
          hasFreeTier={hasFreeTier}
          providerWebsiteUrl={providerWebsiteUrl}
          isDyad={isDyad}
          onBackClick={() => router.history.back()}
        />
        {/* MCP server configuration for both SSE and stdio */}
        {provider === "mcp" && !settingsLoading && (
          <div className="mb-6 mt-4 p-4 border rounded-lg bg-muted">
            <label
              htmlFor="mcp-transport-type"
              className="block text-sm font-medium mb-2"
            >
              MCP Transport Type
            </label>
            <select
              id="mcp-transport-type"
              className="input mb-2"
              value={mcpTransportType}
              onChange={(e) => {
                updateSettings({
                  providerSettings: {
                    ...settings?.providerSettings,
                    mcp: isMcpSettings(settings?.providerSettings?.mcp)
                      ? {
                          ...settings?.providerSettings?.mcp,
                          transportType: e.target.value as "sse" | "stdio",
                        }
                      : {
                          transportType: e.target.value as "sse" | "stdio",
                          sseUrl: mcpUrlInput,
                          apiBaseUrl: { value: mcpUrlInput },
                        },
                  },
                });
              }}
            >
              <option value="sse">SSE (Server-Sent Events)</option>
              <option value="stdio">Stdio (Local Process)</option>
            </select>
            {/* SSE URL input */}
            {mcpTransportType === "sse" && (
              <div className="mt-2">
                <label
                  htmlFor="mcp-url"
                  className="block text-sm font-medium mb-2"
                >
                  MCP SSE Server URL
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    id="mcp-url"
                    type="text"
                    className="input flex-1"
                    value={mcpUrlInput}
                    onChange={(e) => setMcpUrlInput(e.target.value)}
                    placeholder="https://your-mcp-server/sse"
                    disabled={isSavingMcpUrl}
                  />
                  <Button
                    onClick={handleSaveMcpUrl}
                    disabled={isSavingMcpUrl || !mcpUrlInput}
                  >
                    {isSavingMcpUrl ? "Saving..." : "Save URL"}
                  </Button>
                </div>
                {mcpUrlError && (
                  <p className="text-xs text-red-600 mt-1">{mcpUrlError}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Enter the SSE endpoint of your MCP server (e.g.,
                  https://your-mcp-server/sse)
                </p>
              </div>
            )}
            {/* stdio command/args input */}
            {mcpTransportType === "stdio" && (
              <div className="mt-2">
                <label
                  htmlFor="mcp-stdio-command"
                  className="block text-sm font-medium mb-2"
                >
                  MCP Stdio Command
                </label>
                <input
                  id="mcp-stdio-command"
                  type="text"
                  className="input flex-1 mb-2"
                  value={mcpStdioCommand}
                  onChange={(e) => {
                    updateSettings({
                      providerSettings: {
                        ...settings?.providerSettings,
                        mcp: isMcpSettings(settings?.providerSettings?.mcp)
                          ? {
                              ...settings?.providerSettings?.mcp,
                              stdioCommand: e.target.value,
                            }
                          : {
                              transportType: "stdio",
                              stdioCommand: e.target.value,
                              stdioArgs: mcpStdioArgs,
                              env: {},
                            },
                      },
                    });
                  }}
                  placeholder="node"
                />
                <label
                  htmlFor="mcp-stdio-args"
                  className="block text-sm font-medium mb-2"
                >
                  MCP Stdio Args (comma separated)
                </label>
                <input
                  id="mcp-stdio-args"
                  type="text"
                  className="input flex-1"
                  value={mcpStdioArgs.join(",")}
                  onChange={(e) => {
                    const args = e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean);
                    updateSettings({
                      providerSettings: {
                        ...settings?.providerSettings,
                        mcp: isMcpSettings(settings?.providerSettings?.mcp)
                          ? {
                              ...settings?.providerSettings?.mcp,
                              stdioArgs: args,
                            }
                          : {
                              transportType: "stdio",
                              stdioCommand: mcpStdioCommand,
                              stdioArgs: args,
                              env: {},
                            },
                      },
                    });
                  }}
                  placeholder="src/stdio/dist/server.js"
                />
                <MCPEnvEditor
                  env={
                    isMcpSettings(settings?.providerSettings?.mcp) &&
                    settings?.providerSettings?.mcp.env
                      ? settings.providerSettings.mcp.env
                      : {}
                  }
                  onChange={(newEnv) => {
                    updateSettings({
                      providerSettings: {
                        ...settings?.providerSettings,
                        mcp: isMcpSettings(settings?.providerSettings?.mcp)
                          ? {
                              ...settings?.providerSettings?.mcp,
                              env: newEnv,
                            }
                          : {
                              transportType: "stdio",
                              stdioCommand: mcpStdioCommand,
                              stdioArgs: mcpStdioArgs,
                              env: newEnv,
                            },
                      },
                    });
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the command, arguments, and environment variables to
                  launch your MCP stdio server (e.g., node,
                  src/stdio/dist/server.js)
                </p>
              </div>
            )}
          </div>
        )}
        {settingsLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
          </div>
        ) : settingsError ? (
          <Alert variant="destructive">
            <AlertTitle>Error Loading Settings</AlertTitle>
            <AlertDescription>
              Could not load configuration data: {settingsError.message}
            </AlertDescription>
          </Alert>
        ) : (
          <ApiKeyConfiguration
            provider={provider}
            providerDisplayName={providerDisplayName}
            settings={settings}
            envVars={envVars}
            envVarName={envVarName}
            isSaving={isSaving}
            saveError={saveError}
            apiKeyInput={apiKeyInput}
            onApiKeyInputChange={setApiKeyInput}
            onSaveKey={handleSaveKey}
            onDeleteKey={handleDeleteKey}
            isDyad={isDyad}
          />
        )}

        {isDyad && !settingsLoading && (
          <div className="mt-6 flex items-center justify-between p-4 bg-(--background-lightest) rounded-lg border">
            <div>
              <h3 className="font-medium">Enable Trio Pro</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Toggle to enable Trio Pro
              </p>
            </div>
            <Switch
              checked={settings?.enableDyadPro}
              onCheckedChange={handleToggleDyadPro}
              disabled={isSaving}
            />
          </div>
        )}

        {/* Conditionally render CustomModelsSection */}
        {supportsCustomModels && providerData && (
          <ModelsSection providerId={providerData.id} />
        )}
        <div className="h-24"></div>
      </div>
    </div>
  );
}

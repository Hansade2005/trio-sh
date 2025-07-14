import { readFileSync, writeFileSync } from "fs";
const SETTINGS_PATH = "user-settings.json";

export function getUserSettings() {
  return JSON.parse(readFileSync(SETTINGS_PATH, "utf-8"));
}

export function addOrUpdateMCPServer(serverConfig: any) {
  const settings = getUserSettings();
  settings.providerSettings = settings.providerSettings || {};
  settings.providerSettings.mcpServers = settings.providerSettings.mcpServers || [];
  // Remove existing with same id
  settings.providerSettings.mcpServers = settings.providerSettings.mcpServers.filter(
    (s: any) => s.id !== serverConfig.id
  );
  settings.providerSettings.mcpServers.push({ ...serverConfig, active: true });
  writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
} 
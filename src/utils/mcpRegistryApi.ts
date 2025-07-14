const CACHE_KEY = "mcpServerCache";
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function searchMCPServers(query: string) {
  const cache = localStorage.getItem(CACHE_KEY);
  if (cache) {
    const { timestamp, data, lastQuery } = JSON.parse(cache);
    if (Date.now() - timestamp < CACHE_TTL && lastQuery === query) {
      return data;
    }
  }
  const res = await fetch(`https://www.mcp.bar/api/servers?search=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("Failed to fetch MCP servers");
  const data = await res.json();
  localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data, lastQuery: query }));
  return data;
}

export function checkForMCPServerUpdates(installedServers: any[], registryServers: any[]) {
  const updates: any[] = [];
  for (const installed of installedServers) {
    const match = registryServers.find((s: any) => s.id === installed.id);
    if (match && match.version && installed.version && match.version !== installed.version) {
      updates.push({ id: installed.id, current: installed.version, latest: match.version });
    }
  }
  return updates;
} 
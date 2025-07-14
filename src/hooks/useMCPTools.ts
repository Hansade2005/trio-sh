import { useEffect, useRef, useState } from "react";
import { experimental_createMCPClient } from "ai";
import { Experimental_StdioMCPTransport } from "ai/mcp-stdio";

// Utility to read user-settings.json (renderer-safe, fallback to window.localStorage for demo)
function getActiveMCPConfigs() {
  try {
    if (typeof window === "undefined") return [];
    const settings =
      JSON.parse(localStorage.getItem("user-settings") || "{}") || {};
    return (settings.providerSettings?.mcpServers || []).filter(
      (s: any) => s.active,
    );
  } catch {
    return [];
  }
}

export function useMCPTools() {
  const [tools, setTools] = useState<Record<string, any>>({});
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientsRef = useRef<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    (async () => {
      const configs = getActiveMCPConfigs();
      const newClients: any[] = [];
      const allToolsArr: any[] = [];
      for (const cfg of configs) {
        try {
          const transport = new Experimental_StdioMCPTransport({
            command: cfg.stdioCommand,
            args: cfg.stdioArgs || [],
            env: cfg.env || {},
          });
          const client = await experimental_createMCPClient({ transport });
          newClients.push(client);
          const toolset = await client.tools();
          allToolsArr.push(toolset);
        } catch (e: any) {
          // Log error but continue with others
          console.error("Failed to load MCP client/tools:", e);
        }
      }
      if (isMounted) {
        setClients(newClients);
        clientsRef.current = newClients;
        setTools(Object.assign({}, ...allToolsArr));
        setLoading(false);
        setError(newClients.length === 0 ? "No MCP tools loaded" : null);
      }
    })();

    return () => {
      isMounted = false;
      // Clean up: close all clients
      clientsRef.current.forEach(
        (client) => client && client.close && client.close(),
      );
    };
  }, []);

  return { tools, clients, loading, error };
}

import {
  experimental_createMCPClient,
  Experimental_StdioMCPTransport,
} from "ai";
import type { LanguageModelV1 } from "ai";

interface MCPTransportConfig {
  transportType: "sse" | "stdio";
  sseUrl?: string;
  stdioCommand?: string;
  stdioArgs?: string[];
}

export async function createMCPModel(
  config: MCPTransportConfig & { env?: Record<string, string> },
): Promise<{
  model: LanguageModelV1;
  tools: () => Promise<any>;
  close: () => Promise<void>;
}> {
  let transport: any;
  if (config.transportType === "stdio") {
    if (!config.stdioCommand)
      throw new Error("Missing stdioCommand for MCP stdio transport");
    transport = new Experimental_StdioMCPTransport({
      command: config.stdioCommand,
      args: config.stdioArgs || [],
      env: config.env || {},
    });
  } else {
    if (!config.sseUrl) throw new Error("Missing sseUrl for MCP SSE transport");
    transport = { type: "sse", url: config.sseUrl };
  }
  const client = await experimental_createMCPClient({ transport });
  // The client exposes tools() and model interface
  return {
    model: client as unknown as LanguageModelV1,
    tools: client.tools.bind(client),
    close: client.close.bind(client),
  };
}

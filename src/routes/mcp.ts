import { Route } from "@tanstack/react-router";
import { MCPHubPage } from "@/components/mcp-hub/MCPHubPage";
import { rootRoute } from "./root";

export const mcpRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/mcp",
  component: MCPHubPage,
}); 
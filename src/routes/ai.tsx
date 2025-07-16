import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root";
import AIChatPage from "../pages/chat-ai";

export const aiRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/ai",
  component: AIChatPage,
});

import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root";
import AIPage from "../pages/ai";

export const aiRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/ai",
  component: AIPage,
});

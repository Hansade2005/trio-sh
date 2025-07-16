import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root";
import HelpPage from "../pages/help";

export const helpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/help",
  component: HelpPage,
});

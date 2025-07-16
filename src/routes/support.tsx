import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root";
import SupportPage from "../pages/support";

export const supportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/support",
  component: SupportPage,
});

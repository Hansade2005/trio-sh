import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root";
import RoadmapPage from "../pages/roadmap";

export const roadmapRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/roadmap",
  component: RoadmapPage,
});

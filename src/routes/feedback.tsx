import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root";
import FeedbackPage from "../pages/feedback";

export const feedbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/feedback",
  component: FeedbackPage,
});

import { createRouter } from "@tanstack/react-router";
import { rootRoute } from "./routes/root";
import { homeRoute } from "./routes/home";
import { chatRoute } from "./routes/chat";
import { settingsRoute } from "./routes/settings";
import { providerSettingsRoute } from "./routes/settings/providers/$provider";
import { appDetailsRoute } from "./routes/app-details";
import { hubRoute } from "./routes/hub";
import SupportPage from "./pages/support";
import FAQPage from "./pages/faq";
import FeedbackPage from "./pages/feedback";
import RoadmapPage from "./pages/roadmap";
import { createRoute } from "@tanstack/react-router";
import AIPage from "./pages/ai";

const routeTree = rootRoute.addChildren([
  homeRoute,
  hubRoute,
  chatRoute,
  appDetailsRoute,
  settingsRoute.addChildren([providerSettingsRoute]),
  supportRoute,
  faqRoute,
  feedbackRoute,
  roadmapRoute,
  aiRoute,
]);

// src/components/NotFoundRedirect.tsx
import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { ErrorBoundary } from "./components/ErrorBoundary";

export function NotFoundRedirect() {
  const navigate = useNavigate();

  React.useEffect(() => {
    // Navigate to the main route ('/') immediately on mount
    // 'replace: true' prevents the invalid URL from being added to browser history
    navigate({ to: "/", replace: true });
  }, [navigate]); // Dependency array ensures this runs only once

  // Optionally render null or a loading indicator while redirecting
  // The redirect is usually very fast, so null is often fine.
  return null;
  // Or: return <div>Redirecting...</div>;
}

export const router = createRouter({
  routeTree,
  defaultNotFoundComponent: NotFoundRedirect,
  defaultErrorComponent: ErrorBoundary,
});

export const supportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/support",
  component: SupportPage,
});

export const faqRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/faq",
  component: FAQPage,
});
export const feedbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/feedback",
  component: FeedbackPage,
});

export const roadmapRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/roadmap",
  component: RoadmapPage,
});

export const aiRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/ai",
  component: AIPage,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root";
import FAQPage from "../pages/faq";

export const faqRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/faq",
  component: FAQPage,
});

import { createFileRoute } from "@tanstack/react-router";

import { ViewsPage } from "~/features/app-shell/pages/ViewsPage";

export const Route = createFileRoute("/_base/views")({
  component: ViewsPage,
});

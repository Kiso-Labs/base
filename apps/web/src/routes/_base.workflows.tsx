import { createFileRoute } from "@tanstack/react-router";

import { WorkflowsPage } from "~/features/app-shell/pages/WorkflowsPage";

export const Route = createFileRoute("/_base/workflows")({
  component: WorkflowsPage,
});

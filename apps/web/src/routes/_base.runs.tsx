import { createFileRoute } from "@tanstack/react-router";

import { RunsPage } from "~/features/app-shell/pages/RunsPage";

export const Route = createFileRoute("/_base/runs")({
  component: RunsPage,
});

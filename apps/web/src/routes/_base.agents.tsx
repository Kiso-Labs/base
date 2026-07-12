import { createFileRoute } from "@tanstack/react-router";

import { AgentsPage } from "~/features/app-shell/pages/AgentsPage";

export const Route = createFileRoute("/_base/agents")({
  component: AgentsPage,
});

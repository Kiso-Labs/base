import { createFileRoute } from "@tanstack/react-router";

import { IssuesPage } from "~/features/app-shell/pages/IssuesPage";

export const Route = createFileRoute("/_base/issues")({
  component: IssuesPage,
});

import { createFileRoute } from "@tanstack/react-router";

import { RepositoryPage } from "~/features/app-shell/pages/RepositoryPage";

export const Route = createFileRoute("/_base/repository")({
  component: RepositoryPage,
});

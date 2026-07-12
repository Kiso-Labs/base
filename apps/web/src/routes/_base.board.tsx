import { createFileRoute } from "@tanstack/react-router";

import { BoardPage } from "~/features/app-shell/pages/BoardPage";

export const Route = createFileRoute("/_base/board")({
  component: BoardPage,
});

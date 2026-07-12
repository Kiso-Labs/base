import { createFileRoute } from "@tanstack/react-router";

import { InboxPage } from "~/features/app-shell/pages/InboxPage";

export const Route = createFileRoute("/_base/inbox")({
  component: InboxPage,
});

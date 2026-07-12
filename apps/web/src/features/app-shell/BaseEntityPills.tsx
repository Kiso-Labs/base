import { AlertTriangleIcon, ArrowDownIcon, ArrowUpIcon, MinusIcon } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

import type { BaseIssueStatus, BasePriority, BaseRunSummary } from "./workspaceRepository";

export function IssueStatusBadge({ status }: { readonly status: BaseIssueStatus }) {
  const variant =
    status === "Done"
      ? "success"
      : status === "Blocked"
        ? "error"
        : status === "Running" || status === "Review"
          ? "info"
          : status === "Queued"
            ? "warning"
            : "secondary";

  return (
    <Badge className="font-normal" size="sm" variant={variant}>
      <span className="size-1 rounded-full bg-current opacity-70" />
      {status}
    </Badge>
  );
}

export function RunStatusBadge({ status }: { readonly status: BaseRunSummary["status"] }) {
  const variant =
    status === "Succeeded"
      ? "success"
      : status === "Failed"
        ? "error"
        : status === "Running"
          ? "info"
          : status === "Waiting"
            ? "warning"
            : "secondary";
  return (
    <Badge className="font-normal" size="sm" variant={variant}>
      {status}
    </Badge>
  );
}

export function PriorityLabel({ priority }: { readonly priority: BasePriority }) {
  const Icon =
    priority === "Urgent"
      ? AlertTriangleIcon
      : priority === "High"
        ? ArrowUpIcon
        : priority === "Low"
          ? ArrowDownIcon
          : MinusIcon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px]",
        priority === "Urgent" && "text-destructive-foreground",
        priority === "High" && "text-warning-foreground",
        priority === "Medium" && "text-foreground/75",
        (priority === "Low" || priority === "None") && "text-muted-foreground",
      )}
    >
      <Icon className="size-3" />
      {priority}
    </span>
  );
}

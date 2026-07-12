import {
  MoreHorizontalIcon,
  PlayIcon,
  PlusIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  ZapIcon,
} from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { cn } from "~/lib/utils";

import { BaseMetricCard, BasePageShell, BasePanel } from "../BasePageShell";
import { useBaseWorkspace } from "../BaseWorkspaceContext";
import type { BaseWorkflowSummary } from "../workspaceRepository";

function WorkflowStatusBadge({ status }: { readonly status: BaseWorkflowSummary["status"] }) {
  return (
    <Badge size="sm" variant={status === "Published" ? "success" : "secondary"}>
      <span className="size-1 rounded-full bg-current opacity-70" />
      {status}
    </Badge>
  );
}

function SuccessRate({ rate }: { readonly rate: number | null }) {
  if (rate === null) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground/70">
        <span className="font-mono">—</span>
        <span>Not measured</span>
      </div>
    );
  }

  return (
    <div className="flex min-w-32 items-center gap-2.5">
      <div
        aria-label={`${rate}% success rate`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={rate}
        className="h-1.5 min-w-16 flex-1 overflow-hidden rounded-full bg-muted"
        role="progressbar"
      >
        <div
          className={cn("h-full rounded-full", rate >= 90 ? "bg-success" : "bg-warning")}
          style={{ width: `${rate}%` }}
        />
      </div>
      <span className="w-8 text-right font-mono text-[11px] text-foreground/80">{rate}%</span>
    </div>
  );
}

function WorkflowRow({ workflow }: { readonly workflow: BaseWorkflowSummary }) {
  return (
    <TableRow className="group h-[62px]">
      <TableCell className="min-w-[320px] whitespace-normal py-2.5 pl-3.5">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-border/65 bg-background text-muted-foreground">
            <ZapIcon className="size-3.5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-foreground">{workflow.name}</p>
            <p className="mt-1 line-clamp-1 text-[11px] leading-4 text-muted-foreground">
              {workflow.description}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <WorkflowStatusBadge status={workflow.status} />
      </TableCell>
      <TableCell>
        <span className="rounded-sm border border-border/60 bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          v{workflow.version}
        </span>
      </TableCell>
      <TableCell className="min-w-40">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-foreground/80">
          <span className="size-1.5 rounded-full bg-info/75" />
          {workflow.trigger}
        </span>
      </TableCell>
      <TableCell className="min-w-40">
        <SuccessRate rate={workflow.successRate} />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-medium text-foreground">
            {workflow.activeRuns}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {workflow.activeRuns === 1 ? "run" : "runs"}
          </span>
        </div>
      </TableCell>
      <TableCell className="pr-3.5 text-right">
        <div className="flex items-center justify-end gap-1 opacity-70 transition-opacity group-hover:opacity-100">
          <Button aria-label={`Run ${workflow.name}`} size="icon-xs" variant="ghost">
            <PlayIcon />
          </Button>
          <Button aria-label={`More actions for ${workflow.name}`} size="icon-xs" variant="ghost">
            <MoreHorizontalIcon />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function WorkflowsPage() {
  const { snapshot } = useBaseWorkspace();
  const publishedWorkflows = snapshot.workflows.filter(({ status }) => status === "Published");
  const measuredWorkflows = snapshot.workflows.filter(
    (workflow): workflow is BaseWorkflowSummary & { readonly successRate: number } =>
      workflow.successRate !== null,
  );
  const averageSuccessRate = measuredWorkflows.length
    ? Math.round(
        measuredWorkflows.reduce((total, { successRate }) => total + successRate, 0) /
          measuredWorkflows.length,
      )
    : 0;
  const activeRuns = snapshot.workflows.reduce((total, workflow) => total + workflow.activeRuns, 0);

  return (
    <BasePageShell
      actions={
        <>
          <Button size="sm" variant="outline">
            <SlidersHorizontalIcon />
            Policies
          </Button>
          <Button size="sm">
            <PlusIcon />
            New workflow
          </Button>
        </>
      }
      description="Define the repeatable paths agents use to plan, implement, validate, and deliver work."
      title="Workflows"
    >
      <div className="space-y-4">
        <BasePanel>
          <div className="grid grid-cols-2 gap-y-4 px-4 py-3.5 sm:grid-cols-4">
            <BaseMetricCard
              detail="Reusable definitions"
              label="Total"
              value={String(snapshot.workflows.length)}
            />
            <BaseMetricCard
              detail="Ready for new runs"
              label="Published"
              tone="success"
              value={String(publishedWorkflows.length)}
            />
            <BaseMetricCard
              detail="Across published versions"
              label="Success rate"
              tone="success"
              value={`${averageSuccessRate}%`}
            />
            <BaseMetricCard
              detail="Running, queued, or waiting"
              label="Active runs"
              tone="info"
              value={String(activeRuns)}
            />
          </div>
        </BasePanel>

        <BasePanel
          description="Reusable execution definitions for this workspace"
          title="Workflow library"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3.5 py-2.5">
            <div className="relative min-w-56 flex-1 sm:max-w-72">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/65" />
              <Input
                aria-label="Search workflows"
                className="h-7 bg-background pl-8 text-xs shadow-none"
                placeholder="Search workflows…"
              />
            </div>
            <div className="flex items-center gap-1">
              <Button size="xs" variant="secondary">
                All workflows
                <span className="font-mono text-[9px] text-muted-foreground">
                  {snapshot.workflows.length}
                </span>
              </Button>
              <Button size="xs" variant="ghost">
                Published
              </Button>
              <Button size="xs" variant="ghost">
                Drafts
              </Button>
            </div>
          </div>
          <Table className="min-w-[960px]">
            <TableHeader className="bg-muted/20">
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-3.5 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  Workflow
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  Version
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  Trigger
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  Success
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  Active
                </TableHead>
                <TableHead className="w-20 pr-3.5 text-right text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshot.workflows.map((workflow) => (
                <WorkflowRow key={workflow.id} workflow={workflow} />
              ))}
            </TableBody>
          </Table>
        </BasePanel>
      </div>
    </BasePageShell>
  );
}

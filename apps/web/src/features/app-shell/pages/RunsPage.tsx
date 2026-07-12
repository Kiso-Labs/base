import {
  ActivityIcon,
  Clock3Icon,
  MoreHorizontalIcon,
  PauseIcon,
  PlayIcon,
  SearchIcon,
  SlidersHorizontalIcon,
} from "lucide-react";

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

import { RunStatusBadge } from "../BaseEntityPills";
import { BaseMetricCard, BasePageShell, BasePanel } from "../BasePageShell";
import { useBaseWorkspace } from "../BaseWorkspaceContext";
import type { BaseIssueSummary, BaseRunSummary, BaseWorkflowSummary } from "../workspaceRepository";

function CurrentStep({ run }: { readonly run: BaseRunSummary }) {
  return (
    <div className="flex min-w-44 items-center gap-2">
      <span className="relative flex size-5 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background">
        {run.status === "Running" ? (
          <>
            <span className="absolute inset-0 animate-ping rounded-full border border-info/35 motion-reduce:animate-none" />
            <ActivityIcon className="size-3 text-info-foreground" />
          </>
        ) : run.status === "Waiting" ? (
          <PauseIcon className="size-2.5 text-warning-foreground" />
        ) : run.status === "Queued" ? (
          <Clock3Icon className="size-2.5 text-muted-foreground" />
        ) : (
          <ActivityIcon className="size-3 text-muted-foreground" />
        )}
      </span>
      <span className="truncate text-[11px] text-foreground/80">{run.currentStep}</span>
    </div>
  );
}

function RunRow({
  issue,
  run,
  workflow,
}: {
  readonly issue: BaseIssueSummary | undefined;
  readonly run: BaseRunSummary;
  readonly workflow: BaseWorkflowSummary | undefined;
}) {
  return (
    <TableRow className="group h-[62px]">
      <TableCell className="pl-3.5">
        <div>
          <span className="font-mono text-[11px] font-medium text-foreground">{run.id}</span>
          <p className="mt-0.5 text-[10px] text-muted-foreground/65">Workflow run</p>
        </div>
      </TableCell>
      <TableCell className="min-w-[250px] max-w-[340px] whitespace-normal">
        {issue ? (
          <div className="min-w-0">
            <Button
              render={<a href="/issues" />}
              className="h-auto p-0 font-mono text-[10px] text-muted-foreground"
              variant="link"
            >
              {issue.identifier}
            </Button>
            <p className="mt-0.5 truncate text-xs text-foreground/85">{issue.title}</p>
          </div>
        ) : (
          <span className="text-[11px] text-muted-foreground">Unknown issue</span>
        )}
      </TableCell>
      <TableCell className="min-w-52 max-w-64 whitespace-normal">
        {workflow ? (
          <div className="min-w-0">
            <Button
              render={<a href="/workflows" />}
              className="h-auto max-w-full justify-start truncate p-0 text-xs font-medium"
              variant="link"
            >
              {workflow.name}
            </Button>
            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/65">
              v{workflow.version}
            </p>
          </div>
        ) : (
          <span className="text-[11px] text-muted-foreground">Unknown workflow</span>
        )}
      </TableCell>
      <TableCell>
        <RunStatusBadge status={run.status} />
      </TableCell>
      <TableCell>
        <CurrentStep run={run} />
      </TableCell>
      <TableCell>
        <span className="text-[11px] text-muted-foreground">{run.startedAt}</span>
      </TableCell>
      <TableCell>
        <span className="font-mono text-[11px] text-foreground/75">{run.duration}</span>
      </TableCell>
      <TableCell className="pr-3.5 text-right">
        <Button aria-label={`More actions for ${run.id}`} size="icon-xs" variant="ghost">
          <MoreHorizontalIcon />
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function RunsPage() {
  const { snapshot } = useBaseWorkspace();
  const runningRuns = snapshot.runs.filter(({ status }) => status === "Running").length;
  const queuedRuns = snapshot.runs.filter(({ status }) => status === "Queued").length;
  const waitingRuns = snapshot.runs.filter(({ status }) => status === "Waiting").length;
  const issuesById = new Map(snapshot.issues.map((issue) => [issue.id, issue]));
  const workflowsById = new Map(snapshot.workflows.map((workflow) => [workflow.id, workflow]));

  return (
    <BasePageShell
      actions={
        <>
          <Button size="sm" variant="outline">
            <SlidersHorizontalIcon />
            Queue settings
          </Button>
          <Button size="sm">
            <PlayIcon />
            Start run
          </Button>
        </>
      }
      description="Inspect the queue, current execution step, and durable history for every workflow run."
      title="Runs"
    >
      <div className="space-y-4">
        <BasePanel>
          <div className="grid grid-cols-2 gap-y-4 px-4 py-3.5 sm:grid-cols-4">
            <BaseMetricCard
              detail="Visible in this workspace"
              label="Total runs"
              value={String(snapshot.runs.length)}
            />
            <BaseMetricCard
              detail="Agents are executing"
              label="Running"
              tone="info"
              value={String(runningRuns)}
            />
            <BaseMetricCard
              detail="Waiting for capacity"
              label="Queued"
              value={String(queuedRuns)}
            />
            <BaseMetricCard
              detail="Needs human or system input"
              label="Waiting"
              tone="warning"
              value={String(waitingRuns)}
            />
          </div>
        </BasePanel>

        <BasePanel
          description="Live queue activity and recent workflow execution"
          title="Run history"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3.5 py-2.5">
            <div className="relative min-w-56 flex-1 sm:max-w-72">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/65" />
              <Input
                aria-label="Search runs"
                className="h-7 bg-background pl-8 text-xs shadow-none"
                placeholder="Search runs or issues…"
              />
            </div>
            <div className="flex items-center gap-1">
              <Button size="xs" variant="secondary">
                All runs
                <span className="font-mono text-[9px] text-muted-foreground">
                  {snapshot.runs.length}
                </span>
              </Button>
              <Button size="xs" variant="ghost">
                Active
              </Button>
              <Button size="xs" variant="ghost">
                Completed
              </Button>
            </div>
          </div>
          <Table className="min-w-[1120px]">
            <TableHeader className="bg-muted/20">
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-3.5 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  Run
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  Issue
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  Workflow
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  Current step
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  Started
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  Duration
                </TableHead>
                <TableHead className="w-12 pr-3.5 text-right text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshot.runs.map((run) => (
                <RunRow
                  issue={issuesById.get(run.issueId)}
                  key={run.id}
                  run={run}
                  workflow={workflowsById.get(run.workflowId)}
                />
              ))}
            </TableBody>
          </Table>
        </BasePanel>
      </div>
    </BasePageShell>
  );
}

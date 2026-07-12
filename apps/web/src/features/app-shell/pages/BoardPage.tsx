import {
  ActivityIcon,
  ChevronDownIcon,
  Clock3Icon,
  Columns3Icon,
  GitPullRequestIcon,
  GripVerticalIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SlidersHorizontalIcon,
  WorkflowIcon,
} from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

import { PriorityLabel } from "../BaseEntityPills";
import { BaseMetricCard, BasePageShell, BasePanel } from "../BasePageShell";
import { useBaseWorkspace } from "../BaseWorkspaceContext";
import type {
  BaseIssueStatus,
  BaseIssueSummary,
  BaseRunSummary,
  BaseWorkflowSummary,
} from "../workspaceRepository";

const boardStatuses = [
  "Backlog",
  "Planned",
  "Ready",
  "Queued",
  "Running",
  "Blocked",
  "Review",
  "Done",
] as const satisfies readonly BaseIssueStatus[];

const statusDotClassName: Record<BaseIssueStatus, string> = {
  Backlog: "bg-muted-foreground/45",
  Planned: "bg-primary/55",
  Ready: "bg-success",
  Queued: "bg-warning",
  Running: "bg-info",
  Blocked: "bg-destructive",
  Review: "bg-primary",
  Done: "bg-success/70",
};

function RunIndicator({ run }: { readonly run: BaseRunSummary | undefined }) {
  if (!run) return null;

  const Icon =
    run.status === "Running"
      ? ActivityIcon
      : run.status === "Waiting"
        ? GitPullRequestIcon
        : Clock3Icon;
  const className =
    run.status === "Running"
      ? "text-info-foreground"
      : run.status === "Waiting"
        ? "text-warning-foreground"
        : "text-muted-foreground";

  return (
    <span className={`flex items-center gap-1 font-mono text-[9px] ${className}`}>
      <Icon
        aria-hidden="true"
        className={
          run.status === "Running" ? "size-3 animate-pulse motion-reduce:animate-none" : "size-3"
        }
      />
      {run.status}
    </span>
  );
}

function BoardCard({
  issue,
  run,
  workflow,
}: {
  readonly issue: BaseIssueSummary;
  readonly run: BaseRunSummary | undefined;
  readonly workflow: BaseWorkflowSummary | undefined;
}) {
  const assigneeInitial = issue.assignee === "Unassigned" ? "—" : issue.assignee.slice(0, 1);

  return (
    <article className="group rounded-md border border-border/75 bg-card px-2.5 py-2.5 shadow-xs/5 transition-[border-color,box-shadow] hover:border-border hover:shadow-sm/10">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 font-mono text-[10px] font-medium text-muted-foreground">
          <GripVerticalIcon
            aria-hidden="true"
            className="-ml-1 size-3 cursor-grab opacity-0 transition-opacity group-hover:opacity-50"
          />
          {issue.identifier}
        </span>
        <Button aria-label={`More actions for ${issue.identifier}`} size="icon-xs" variant="ghost">
          <MoreHorizontalIcon />
        </Button>
      </div>

      <button
        className="mt-1 line-clamp-3 w-full text-left text-xs font-medium leading-[1.15rem] text-foreground/90 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        type="button"
      >
        {issue.title}
      </button>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <PriorityLabel priority={issue.priority} />
        {issue.labels.slice(0, 2).map((label) => (
          <Badge className="font-normal" key={label} size="sm" variant="outline">
            {label}
          </Badge>
        ))}
      </div>

      <div className="mt-3 border-t border-border/50 pt-2">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background text-[9px] font-semibold">
              {assigneeInitial}
            </span>
            <span className="truncate">{issue.assignee}</span>
          </span>
          <RunIndicator run={run} />
        </div>
        {workflow ? (
          <span
            className="mt-2 flex min-w-0 items-center gap-1.5 text-[9px] text-muted-foreground/75"
            title={workflow.name}
          >
            <WorkflowIcon aria-hidden="true" className="size-3 shrink-0" />
            <span className="truncate">{workflow.name}</span>
          </span>
        ) : (
          <span className="mt-2 flex items-center gap-1.5 text-[9px] text-muted-foreground/55">
            <WorkflowIcon aria-hidden="true" className="size-3" />
            No workflow
          </span>
        )}
      </div>
    </article>
  );
}

export function BoardPage() {
  const { selectedProject, snapshot } = useBaseWorkspace();
  const issues = snapshot.issues.filter(({ projectId }) => projectId === selectedProject.id);
  const workflowsById = new Map(snapshot.workflows.map((workflow) => [workflow.id, workflow]));
  const runsByIssueId = new Map(snapshot.runs.map((run) => [run.issueId, run]));
  const queuedCount = issues.filter(({ status }) => status === "Queued").length;
  const runningCount = issues.filter(({ status }) => status === "Running").length;
  const blockedCount = issues.filter(({ status }) => status === "Blocked").length;
  const reviewCount = issues.filter(({ status }) => status === "Review").length;

  return (
    <BasePageShell
      actions={
        <>
          <Button size="sm" variant="outline">
            <SlidersHorizontalIcon />
            Board settings
          </Button>
          <Button size="sm">
            <PlusIcon />
            New issue
          </Button>
        </>
      }
      description="Move work through delivery states while keeping workflow and run context visible."
      title="Board"
    >
      <div className="space-y-4">
        <BasePanel>
          <div className="grid grid-cols-2 gap-y-4 px-4 py-3.5 sm:grid-cols-4">
            <BaseMetricCard
              detail="Waiting for available capacity"
              label="Queued"
              tone="warning"
              value={String(queuedCount)}
            />
            <BaseMetricCard
              detail="Agent execution in progress"
              label="Running"
              tone="info"
              value={String(runningCount)}
            />
            <BaseMetricCard
              detail="Requires intervention"
              label="Blocked"
              tone="warning"
              value={String(blockedCount)}
            />
            <BaseMetricCard
              detail="Waiting for a human decision"
              label="In review"
              tone="success"
              value={String(reviewCount)}
            />
          </div>
        </BasePanel>

        <BasePanel description="Status-based delivery view for Base Desktop" title="Delivery board">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3.5 py-2.5">
            <div className="flex items-center gap-1">
              <Button size="xs" variant="secondary">
                <Columns3Icon />
                Board
              </Button>
              <Button size="xs" variant="ghost">
                Group: status
                <ChevronDownIcon />
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <Button size="xs" variant="ghost">
                <SlidersHorizontalIcon />
                Filters
              </Button>
              <span className="ml-1 font-mono text-[9px] text-muted-foreground">
                {issues.length} issues
              </span>
            </div>
          </div>

          <div className="overflow-x-auto overscroll-x-contain">
            <div className="grid min-w-[1840px] grid-cols-8 divide-x divide-border/60">
              {boardStatuses.map((status) => {
                const columnIssues = issues.filter((issue) => issue.status === status);
                const headingId = `board-column-${status.toLocaleLowerCase()}`;

                return (
                  <section
                    aria-labelledby={headingId}
                    className="min-h-[440px] min-w-0 bg-muted/10"
                    key={status}
                  >
                    <div className="flex h-10 items-center justify-between border-b border-border/50 px-2.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          aria-hidden="true"
                          className={`size-1.5 shrink-0 rounded-full ${statusDotClassName[status]}`}
                        />
                        <h3
                          className="truncate text-[11px] font-semibold text-foreground/85"
                          id={headingId}
                        >
                          {status}
                        </h3>
                        <span className="rounded-sm bg-muted px-1 font-mono text-[9px] leading-4 text-muted-foreground">
                          {columnIssues.length}
                        </span>
                      </div>
                      <Button
                        aria-label={`Add an issue to ${status}`}
                        size="icon-xs"
                        variant="ghost"
                      >
                        <PlusIcon />
                      </Button>
                    </div>

                    <div className="space-y-2 p-2">
                      {columnIssues.map((issue) => (
                        <BoardCard
                          issue={issue}
                          key={issue.id}
                          run={runsByIssueId.get(issue.id)}
                          workflow={
                            issue.workflowId ? workflowsById.get(issue.workflowId) : undefined
                          }
                        />
                      ))}
                      {columnIssues.length === 0 ? (
                        <button
                          className="flex h-16 w-full items-center justify-center rounded-md border border-dashed border-border/60 text-[10px] text-muted-foreground/55 outline-none transition-colors hover:border-border hover:bg-background/40 hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                          type="button"
                        >
                          <PlusIcon aria-hidden="true" className="mr-1 size-3" />
                          Add issue
                        </button>
                      ) : null}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </BasePanel>
      </div>
    </BasePageShell>
  );
}

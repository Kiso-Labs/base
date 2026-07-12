import {
  ArrowUpDownIcon,
  MoreHorizontalIcon,
  PlayIcon,
  PlusIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  WorkflowIcon,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

import { IssueStatusBadge, PriorityLabel } from "../BaseEntityPills";
import { BaseMetricCard, BasePageShell, BasePanel } from "../BasePageShell";
import { useBaseWorkspace } from "../BaseWorkspaceContext";
import type { BaseIssueSummary, BaseWorkflowSummary } from "../workspaceRepository";

interface IssuePreviewMetadata {
  readonly cycle: string;
  readonly module: string;
  readonly queue: string;
}

const issuePreviewMetadata: Record<string, IssuePreviewMetadata> = {
  "BAS-101": { cycle: "Cycle 03", module: "Agent runtime", queue: "Ready" },
  "BAS-102": { cycle: "Cycle 03", module: "Runtime safety", queue: "Executing" },
  "BAS-103": { cycle: "Icebox", module: "Workflow builder", queue: "—" },
  "BAS-104": { cycle: "Cycle 02", module: "Run observability", queue: "Review" },
  "BAS-105": { cycle: "Cycle 03", module: "Repository safety", queue: "#2" },
};

function RunStateBadge({ state }: { readonly state: BaseIssueSummary["runState"] }) {
  const presentation = {
    idle: { label: "Idle", variant: "secondary" as const },
    queued: { label: "Queued", variant: "warning" as const },
    running: { label: "Active", variant: "info" as const },
    review: { label: "Review", variant: "success" as const },
  }[state];

  return (
    <Badge size="sm" variant={presentation.variant}>
      <span className="size-1 rounded-full bg-current opacity-70" />
      {presentation.label}
    </Badge>
  );
}

function IssueRow({
  issue,
  workflow,
}: {
  readonly issue: BaseIssueSummary;
  readonly workflow: BaseWorkflowSummary | undefined;
}) {
  const metadata = issuePreviewMetadata[issue.identifier] ?? {
    cycle: "Unscheduled",
    module: "Unassigned",
    queue: "—",
  };
  const assigneeInitial = issue.assignee === "Unassigned" ? "—" : issue.assignee.slice(0, 1);

  return (
    <TableRow className="group h-[58px]">
      <TableCell className="w-9 pl-3.5">
        <Checkbox aria-label={`Select ${issue.identifier}`} />
      </TableCell>
      <TableCell className="min-w-[360px] max-w-[520px] whitespace-normal py-2">
        <button
          className="block min-w-0 max-w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          type="button"
        >
          <span className="flex items-center gap-2">
            <span className="shrink-0 font-mono text-[10px] font-medium text-muted-foreground">
              {issue.identifier}
            </span>
            <span className="truncate text-xs font-medium text-foreground/90">{issue.title}</span>
          </span>
          <span className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground/65">
            Updated {issue.updatedAt}
            <span aria-hidden="true">·</span>
            {metadata.module}
          </span>
        </button>
      </TableCell>
      <TableCell>
        <IssueStatusBadge status={issue.status} />
      </TableCell>
      <TableCell>
        <PriorityLabel priority={issue.priority} />
      </TableCell>
      <TableCell className="min-w-40">
        <div className="flex items-center gap-1">
          {issue.labels.map((label) => (
            <Badge className="font-normal" key={label} size="sm" variant="outline">
              {label}
            </Badge>
          ))}
        </div>
      </TableCell>
      <TableCell>
        <span className="text-[11px] text-foreground/75">{metadata.module}</span>
      </TableCell>
      <TableCell>
        <span className="text-[11px] text-muted-foreground">{metadata.cycle}</span>
      </TableCell>
      <TableCell className="min-w-36">
        <span className="flex items-center gap-2 text-[11px] text-foreground/80">
          <span className="flex size-5 items-center justify-center rounded-full border border-border/70 bg-background text-[9px] font-semibold text-muted-foreground">
            {assigneeInitial}
          </span>
          <span className="truncate">{issue.assignee}</span>
        </span>
      </TableCell>
      <TableCell className="min-w-48 max-w-64">
        {workflow ? (
          <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-foreground/75">
            <WorkflowIcon aria-hidden="true" className="size-3 shrink-0 text-muted-foreground" />
            <span className="truncate">{workflow.name}</span>
          </span>
        ) : (
          <Button className="h-auto p-0 text-[11px]" size="xs" variant="link">
            Attach workflow
          </Button>
        )}
      </TableCell>
      <TableCell>
        <span className="font-mono text-[10px] text-muted-foreground">{metadata.queue}</span>
      </TableCell>
      <TableCell>
        <RunStateBadge state={issue.runState} />
      </TableCell>
      <TableCell className="pr-3.5 text-right">
        <div className="flex items-center justify-end gap-2">
          <span className="text-[10px] text-muted-foreground">{issue.updatedAt}</span>
          <Button
            aria-label={`More actions for ${issue.identifier}`}
            size="icon-xs"
            variant="ghost"
          >
            <MoreHorizontalIcon />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function IssuesPage() {
  const { selectedProject, snapshot } = useBaseWorkspace();
  const [search, setSearch] = useState("");
  const issues = snapshot.issues.filter(({ projectId }) => projectId === selectedProject.id);
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const visibleIssues = normalizedSearch
    ? issues.filter((issue) =>
        [issue.identifier, issue.title, issue.assignee, ...issue.labels]
          .join(" ")
          .toLocaleLowerCase()
          .includes(normalizedSearch),
      )
    : issues;
  const activeIssues = issues.filter(({ runState }) => runState !== "idle").length;
  const readyIssues = issues.filter(({ status }) => status === "Ready").length;
  const attachedIssues = issues.filter(({ workflowId }) => workflowId !== null).length;
  const workflowCoverage = issues.length ? Math.round((attachedIssues / issues.length) * 100) : 0;
  const workflowsById = new Map(snapshot.workflows.map((workflow) => [workflow.id, workflow]));

  return (
    <BasePageShell
      actions={
        <>
          <Button size="sm" variant="outline">
            <PlayIcon />
            Queue selected
          </Button>
          <Button size="sm">
            <PlusIcon />
            New issue
          </Button>
        </>
      }
      description="Plan work, attach reliable delivery paths, and track every issue through execution."
      title="Issues"
    >
      <div className="space-y-4">
        <BasePanel>
          <div className="grid grid-cols-2 gap-y-4 px-4 py-3.5 sm:grid-cols-4">
            <BaseMetricCard
              detail="In the current project"
              label="Total issues"
              value={String(issues.length)}
            />
            <BaseMetricCard
              detail="Queued, running, or in review"
              label="Active automation"
              tone="info"
              value={String(activeIssues)}
            />
            <BaseMetricCard
              detail="Eligible for a workflow run"
              label="Ready"
              tone="success"
              value={String(readyIssues)}
            />
            <BaseMetricCard
              detail={`${attachedIssues} of ${issues.length} issues covered`}
              label="Workflow coverage"
              tone="success"
              value={`${workflowCoverage}%`}
            />
          </div>
        </BasePanel>

        <BasePanel description="Dense project view with execution context" title="All issues">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3.5 py-2.5">
            <div className="relative min-w-56 flex-1 sm:max-w-80">
              <SearchIcon
                aria-hidden="true"
                className="pointer-events-none absolute left-2.5 top-1/2 z-10 size-3.5 -translate-y-1/2 text-muted-foreground/65"
              />
              <Input
                aria-label="Search issues"
                className="h-7 bg-background pl-8 text-xs shadow-none"
                onChange={(event) => setSearch(event.currentTarget.value)}
                placeholder="Search issues, labels, or assignees…"
                value={search}
              />
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <Button size="xs" variant="secondary">
                All issues
                <span className="font-mono text-[9px] text-muted-foreground">{issues.length}</span>
              </Button>
              <Button size="xs" variant="ghost">
                Active
                <span className="font-mono text-[9px] text-muted-foreground">{activeIssues}</span>
              </Button>
              <Button size="xs" variant="ghost">
                <SlidersHorizontalIcon />
                Filter
              </Button>
              <Button size="xs" variant="ghost">
                <ArrowUpDownIcon />
                Updated
              </Button>
            </div>
          </div>

          <Table className="min-w-[1480px]">
            <TableHeader className="bg-muted/20">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-9 pl-3.5">
                  <Checkbox aria-label="Select all visible issues" />
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  Issue
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  Priority
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  Labels
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  Module
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  Cycle
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  Assignee
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  Workflow
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  Queue
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  Run
                </TableHead>
                <TableHead className="pr-3.5 text-right text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  Updated
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleIssues.map((issue) => (
                <IssueRow
                  issue={issue}
                  key={issue.id}
                  workflow={issue.workflowId ? workflowsById.get(issue.workflowId) : undefined}
                />
              ))}
              {visibleIssues.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    className="h-32 text-center text-xs text-muted-foreground"
                    colSpan={12}
                  >
                    No issues match “{search}”.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between border-t border-border/60 px-3.5 py-2 text-[10px] text-muted-foreground">
            <span>
              Showing {visibleIssues.length} of {issues.length} issues
            </span>
            <span>Use ↑ and ↓ to move through the list</span>
          </div>
        </BasePanel>
      </div>
    </BasePageShell>
  );
}

import {
  ArrowUpDownIcon,
  MoreHorizontalIcon,
  PlayIcon,
  PlusIcon,
  WorkflowIcon,
  XIcon,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

import { IssueStatusBadge, PriorityLabel } from "../BaseEntityPills";
import { BasePageShell } from "../BasePageShell";
import { useBaseWorkspace } from "../BaseWorkspaceContext";
import { IssueCreateDialog } from "../IssueCreateDialog";
import { IssueInspector } from "../IssueInspector";
import { DEFAULT_ISSUE_FILTERS, filterIssues, groupIssues } from "../issueRepository";
import { useIssueWorkspaceStore } from "../issueWorkspaceStore";
import { ProjectIssueViewBar } from "../ProjectIssueViewBar";
import { QueueIssuesDialog } from "../QueueIssuesDialog";
import type { BaseIssueSummary, BaseWorkflowSummary } from "../workspaceRepository";

const PRIORITY_ORDER = { Urgent: 0, High: 1, Medium: 2, Low: 3, None: 4 } as const;

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
  onOpen,
  onSelectedChange,
  selected,
  workflow,
}: {
  readonly issue: BaseIssueSummary;
  readonly onOpen: () => void;
  readonly onSelectedChange: (selected: boolean) => void;
  readonly selected: boolean;
  readonly workflow: BaseWorkflowSummary | undefined;
}) {
  const assigneeInitial = issue.assignee === "Unassigned" ? "—" : issue.assignee.slice(0, 1);

  return (
    <TableRow className="group h-11" data-selected={selected || undefined}>
      <TableCell className="w-9 pl-3.5">
        <Checkbox
          aria-label={`Select ${issue.identifier}`}
          checked={selected}
          onCheckedChange={(checked) => onSelectedChange(checked === true)}
        />
      </TableCell>
      <TableCell className="min-w-[340px] max-w-[540px] whitespace-normal py-1.5">
        <button
          className="block min-w-0 max-w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          data-issue-id={issue.id}
          onClick={onOpen}
          type="button"
        >
          <span className="flex items-center gap-2">
            <span className="shrink-0 font-mono text-[10px] font-medium text-muted-foreground">
              {issue.identifier}
            </span>
            <span className="truncate text-xs font-medium text-foreground/90">{issue.title}</span>
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[9px] text-muted-foreground/65">
            {issue.module}
            <span aria-hidden="true">·</span>
            {issue.cycle}
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
          {issue.labels.slice(0, 3).map((label) => (
            <Badge className="font-normal" key={label} size="sm" variant="outline">
              {label}
            </Badge>
          ))}
        </div>
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
          <button
            className="flex min-w-0 items-center gap-1.5 text-left text-[11px] text-foreground/75 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={onOpen}
            type="button"
          >
            <WorkflowIcon aria-hidden="true" className="size-3 shrink-0 text-muted-foreground" />
            <span className="truncate">{workflow.name}</span>
          </button>
        ) : (
          <Button className="h-auto p-0 text-[11px]" onClick={onOpen} size="xs" variant="link">
            Attach workflow
          </Button>
        )}
      </TableCell>
      <TableCell>
        <RunStateBadge state={issue.runState} />
      </TableCell>
      <TableCell className="pr-3.5 text-right">
        <div className="flex items-center justify-end gap-2">
          <span className="text-[10px] text-muted-foreground">{issue.updatedAt}</span>
          <Button
            aria-label={`Open ${issue.identifier}`}
            onClick={onOpen}
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
  const filters = useIssueWorkspaceStore(
    (state) => state.filtersByProject[selectedProject.id] ?? DEFAULT_ISSUE_FILTERS,
  );
  const selectedIssueIds = useIssueWorkspaceStore((state) => state.selectedIssueIds);
  const groupBy = useIssueWorkspaceStore(
    (state) => state.groupByByProject[selectedProject.id] ?? "none",
  );
  const toggleIssueSelection = useIssueWorkspaceStore((state) => state.toggleIssueSelection);
  const setIssueSelection = useIssueWorkspaceStore((state) => state.setIssueSelection);
  const clearIssueSelection = useIssueWorkspaceStore((state) => state.clearIssueSelection);
  const selectIssue = useIssueWorkspaceStore((state) => state.selectIssue);
  const uiIntent = useIssueWorkspaceStore((state) => state.uiIntent);
  const consumeUiIntent = useIssueWorkspaceStore((state) => state.consumeUiIntent);
  const [createOpen, setCreateOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [sort, setSort] = useState<"updated" | "priority">("updated");
  const projectIssues = snapshot.issues.filter(({ projectId }) => projectId === selectedProject.id);
  const filteredIssues = filterIssues(snapshot.issues, selectedProject.id, filters);
  const visibleIssues = useMemo(
    () =>
      sort === "priority"
        ? [...filteredIssues].toSorted(
            (left, right) => PRIORITY_ORDER[left.priority] - PRIORITY_ORDER[right.priority],
          )
        : filteredIssues,
    [filteredIssues, sort],
  );
  const workflowsById = new Map(snapshot.workflows.map((workflow) => [workflow.id, workflow]));
  const visibleGroups = groupIssues(visibleIssues, groupBy);
  const selectedSet = new Set(selectedIssueIds);
  const visibleIssueIds = visibleIssues.map(({ id }) => id);
  const allVisibleSelected =
    visibleIssueIds.length > 0 && visibleIssueIds.every((issueId) => selectedSet.has(issueId));

  useEffect(() => {
    if (uiIntent?.type !== "queue-view" || uiIntent.projectId !== selectedProject.id) return;
    clearIssueSelection();
    setIssueSelection(uiIntent.issueIds, true);
    setQueueOpen(true);
    consumeUiIntent(uiIntent.id);
  }, [clearIssueSelection, consumeUiIntent, selectedProject.id, setIssueSelection, uiIntent]);

  return (
    <>
      <BasePageShell
        actions={
          <Button onClick={() => setCreateOpen(true)} size="sm">
            <PlusIcon />
            New issue
            <span className="font-mono text-[9px] opacity-65">C</span>
          </Button>
        }
        density="workspace"
        description="Plan work, attach reusable workflows, and keep execution history inside this project."
        title="Issues"
      >
        <div className="overflow-hidden rounded-lg border border-border/60 bg-background shadow-xs">
          <ProjectIssueViewBar
            layout="list"
            onRunView={(issueIds) => {
              clearIssueSelection();
              setIssueSelection(issueIds, true);
              setQueueOpen(true);
            }}
            visibleIssueIds={visibleIssueIds}
          />
          <div className="flex items-center justify-end border-b border-border/60 px-3.5 py-1.5">
            <Button
              onClick={() => setSort((current) => (current === "updated" ? "priority" : "updated"))}
              size="xs"
              variant="ghost"
            >
              <ArrowUpDownIcon />
              Sort: {sort === "updated" ? "Updated" : "Priority"}
            </Button>
          </div>

          {selectedIssueIds.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 border-b border-primary/20 bg-primary/5 px-3.5 py-2">
              <span className="text-xs font-medium">{selectedIssueIds.length} selected</span>
              <Button onClick={() => setQueueOpen(true)} size="xs" variant="secondary">
                <PlayIcon />
                Queue
              </Button>
              <Button className="ml-auto" onClick={clearIssueSelection} size="xs" variant="ghost">
                <XIcon />
                Clear
              </Button>
            </div>
          ) : null}

          <Table className="min-w-[1080px]">
            <TableHeader className="bg-muted/20">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-9 pl-3.5">
                  <Checkbox
                    aria-label="Select all visible issues"
                    checked={allVisibleSelected}
                    onCheckedChange={(checked) =>
                      setIssueSelection(visibleIssueIds, checked === true)
                    }
                  />
                </TableHead>
                {[
                  "Issue",
                  "Status",
                  "Priority",
                  "Labels",
                  "Assignee",
                  "Workflow",
                  "Run",
                  "Updated",
                ].map((heading) => (
                  <TableHead
                    className={
                      heading === "Updated"
                        ? "pr-3.5 text-right text-[10px] uppercase tracking-[0.08em] text-muted-foreground"
                        : "text-[10px] uppercase tracking-[0.08em] text-muted-foreground"
                    }
                    key={heading}
                  >
                    {heading}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleGroups.map((group) => (
                <Fragment key={group.key}>
                  {groupBy !== "none" ? (
                    <TableRow className="h-8 bg-muted/25 hover:bg-muted/25">
                      <TableCell className="px-3.5" colSpan={9}>
                        <span className="text-[10px] font-semibold text-foreground/75">
                          {groupBy === "workflow"
                            ? (workflowsById.get(group.key)?.name ?? group.key)
                            : group.key}
                        </span>
                        <span className="ml-2 font-mono text-[9px] text-muted-foreground">
                          {group.issues.length}
                        </span>
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {group.issues.map((issue) => (
                    <IssueRow
                      issue={issue}
                      key={issue.id}
                      onOpen={() => selectIssue(issue.id)}
                      onSelectedChange={(selected) => toggleIssueSelection(issue.id, selected)}
                      selected={selectedSet.has(issue.id)}
                      workflow={issue.workflowId ? workflowsById.get(issue.workflowId) : undefined}
                    />
                  ))}
                </Fragment>
              ))}
              {visibleIssues.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell className="h-32 text-center text-xs text-muted-foreground" colSpan={9}>
                    No issues match the current project filters.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between border-t border-border/60 px-3.5 py-2 text-[10px] text-muted-foreground">
            <span>
              Showing {visibleIssues.length} of {projectIssues.length} project issues
            </span>
            <span>Click a row to open details · C creates an issue</span>
          </div>
        </div>
      </BasePageShell>

      <IssueCreateDialog onOpenChange={setCreateOpen} open={createOpen} />
      <QueueIssuesDialog issueIds={selectedIssueIds} onOpenChange={setQueueOpen} open={queueOpen} />
      <IssueInspector />
    </>
  );
}

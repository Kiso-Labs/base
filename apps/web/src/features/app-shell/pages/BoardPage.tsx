import {
  DndContext,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  ActivityIcon,
  Clock3Icon,
  GitPullRequestIcon,
  GripVerticalIcon,
  MoreHorizontalIcon,
  PlusIcon,
  WorkflowIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { toastManager } from "~/components/ui/toast";
import { cn } from "~/lib/utils";

import { PriorityLabel } from "../BaseEntityPills";
import { BasePageShell } from "../BasePageShell";
import { useBaseWorkspace } from "../BaseWorkspaceContext";
import { IssueCreateDialog } from "../IssueCreateDialog";
import { IssueInspector } from "../IssueInspector";
import { DEFAULT_ISSUE_FILTERS, filterIssues, hasActiveIssueFilters } from "../issueRepository";
import { useIssueWorkspaceStore } from "../issueWorkspaceStore";
import { ProjectIssueViewBar } from "../ProjectIssueViewBar";
import { QueueIssuesDialog } from "../QueueIssuesDialog";
import {
  BASE_ISSUE_STATUSES,
  type BaseIssueStatus,
  type BaseIssueSummary,
  type BaseRunSummary,
  type BaseWorkflowSummary,
} from "../workspaceRepository";

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
  onOpen,
  run,
  workflow,
}: {
  readonly issue: BaseIssueSummary;
  readonly onOpen: () => void;
  readonly run: BaseRunSummary | undefined;
  readonly workflow: BaseWorkflowSummary | undefined;
}) {
  const { attributes, isDragging, listeners, setNodeRef, transform } = useDraggable({
    id: issue.id,
    data: { status: issue.status },
  });
  const assigneeInitial = issue.assignee === "Unassigned" ? "—" : issue.assignee.slice(0, 1);

  return (
    <article
      className={cn(
        "group rounded-md border border-border/75 bg-card px-2.5 py-2.5 shadow-xs/5 transition-[border-color,box-shadow,opacity] hover:border-border hover:shadow-sm/10",
        isDragging && "z-20 opacity-45",
      )}
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 font-mono text-[10px] font-medium text-muted-foreground">
          <button
            {...attributes}
            {...listeners}
            aria-label={`Move ${issue.identifier}`}
            className="-ml-1 cursor-grab rounded-sm text-muted-foreground/45 outline-none hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
            type="button"
          >
            <GripVerticalIcon aria-hidden="true" className="size-3" />
          </button>
          {issue.identifier}
        </span>
        <Button
          aria-label={`Open ${issue.identifier}`}
          onClick={onOpen}
          size="icon-xs"
          variant="ghost"
        >
          <MoreHorizontalIcon />
        </Button>
      </div>

      <button
        className="mt-1 line-clamp-3 w-full text-left text-xs font-medium leading-[1.15rem] text-foreground/90 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        data-issue-id={issue.id}
        onClick={onOpen}
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
        <button
          className="mt-2 flex min-w-0 items-center gap-1.5 text-left text-[9px] text-muted-foreground/75 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onOpen}
          type="button"
        >
          <WorkflowIcon aria-hidden="true" className="size-3 shrink-0" />
          <span className="truncate">{workflow?.name ?? "No workflow template"}</span>
        </button>
      </div>
    </article>
  );
}

function BoardColumn({
  issues,
  onCreate,
  onOpenIssue,
  runsByIssueId,
  status,
  workflowsById,
}: {
  readonly issues: readonly BaseIssueSummary[];
  readonly onCreate: (status: "Backlog" | "Planned" | "Ready") => void;
  readonly onOpenIssue: (issueId: string) => void;
  readonly runsByIssueId: ReadonlyMap<string, BaseRunSummary>;
  readonly status: BaseIssueStatus;
  readonly workflowsById: ReadonlyMap<string, BaseWorkflowSummary>;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: status });
  const headingId = `board-column-${status.toLocaleLowerCase()}`;
  const canCreateInColumn = status === "Backlog" || status === "Planned" || status === "Ready";

  return (
    <section
      aria-labelledby={headingId}
      className={cn("min-h-[440px] min-w-0 bg-muted/10", isOver && "bg-primary/5")}
      ref={setNodeRef}
    >
      <div className="flex h-10 items-center justify-between border-b border-border/50 px-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className={`size-1.5 shrink-0 rounded-full ${statusDotClassName[status]}`}
          />
          <h3 className="truncate text-[11px] font-semibold text-foreground/85" id={headingId}>
            {status}
          </h3>
          <span className="rounded-sm bg-muted px-1 font-mono text-[9px] leading-4 text-muted-foreground">
            {issues.length}
          </span>
        </div>
        {canCreateInColumn ? (
          <Button
            aria-label={`Add an issue to ${status}`}
            onClick={() => onCreate(status)}
            size="icon-xs"
            variant="ghost"
          >
            <PlusIcon />
          </Button>
        ) : null}
      </div>

      <div className="space-y-2 p-2">
        {issues.map((issue) => (
          <BoardCard
            issue={issue}
            key={issue.id}
            onOpen={() => onOpenIssue(issue.id)}
            run={runsByIssueId.get(issue.id)}
            workflow={issue.workflowId ? workflowsById.get(issue.workflowId) : undefined}
          />
        ))}
        {issues.length === 0 ? (
          <div className="flex h-16 items-center justify-center rounded-md border border-dashed border-border/60 px-3 text-center text-[10px] text-muted-foreground/55">
            {isOver ? "Drop to move here" : "No matching issues"}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function BoardPage() {
  const { selectedProject, snapshot } = useBaseWorkspace();
  const filters = useIssueWorkspaceStore(
    (state) => state.filtersByProject[selectedProject.id] ?? DEFAULT_ISSUE_FILTERS,
  );
  const selectIssue = useIssueWorkspaceStore((state) => state.selectIssue);
  const transitionIssue = useIssueWorkspaceStore((state) => state.transitionIssue);
  const queueIssues = useIssueWorkspaceStore((state) => state.queueIssues);
  const dequeueIssue = useIssueWorkspaceStore((state) => state.dequeueIssue);
  const uiIntent = useIssueWorkspaceStore((state) => state.uiIntent);
  const consumeUiIntent = useIssueWorkspaceStore((state) => state.consumeUiIntent);
  const resetFilters = useIssueWorkspaceStore((state) => state.resetFilters);
  const [createOpen, setCreateOpen] = useState(false);
  const [createStatus, setCreateStatus] = useState<"Backlog" | "Planned" | "Ready">("Backlog");
  const [announcement, setAnnouncement] = useState("");
  const [queueOpen, setQueueOpen] = useState(false);
  const [viewQueueIds, setViewQueueIds] = useState<readonly string[]>([]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const projectIssues = snapshot.issues.filter(({ projectId }) => projectId === selectedProject.id);
  const visibleIssues = filterIssues(snapshot.issues, selectedProject.id, filters);
  const workflowsById = new Map(snapshot.workflows.map((workflow) => [workflow.id, workflow]));
  const runsByIssueId = new Map(
    snapshot.runs
      .filter(({ projectId }) => projectId === selectedProject.id)
      .map((run) => [run.issueId, run]),
  );

  const openCreate = (status: "Backlog" | "Planned" | "Ready" = "Backlog") => {
    setCreateStatus(status);
    setCreateOpen(true);
  };

  useEffect(() => {
    if (uiIntent?.type !== "queue-view" || uiIntent.projectId !== selectedProject.id) return;
    setViewQueueIds(uiIntent.issueIds);
    setQueueOpen(true);
    consumeUiIntent(uiIntent.id);
  }, [consumeUiIntent, selectedProject.id, uiIntent]);

  const moveIssue = ({ active, over }: DragEndEvent) => {
    if (!over) return;
    const issueId = String(active.id);
    const nextStatus = String(over.id) as BaseIssueStatus;
    const issue = projectIssues.find(({ id }) => id === issueId);
    if (!issue || issue.status === nextStatus) return;

    if (nextStatus === "Queued") {
      const result = queueIssues([issueId]);
      const rejection = result.rejected[0];
      if (rejection) {
        setAnnouncement(rejection.reason);
        toastManager.add({ type: "error", title: "Move blocked", description: rejection.reason });
        return;
      }
    } else if (issue.status === "Queued" && nextStatus === "Ready") {
      const result = dequeueIssue(issueId);
      if (!result.ok) {
        setAnnouncement(result.reason);
        toastManager.add({ type: "error", title: "Move blocked", description: result.reason });
        return;
      }
    } else {
      const result = transitionIssue(issueId, nextStatus);
      if (!result.ok) {
        setAnnouncement(result.reason);
        toastManager.add({ type: "error", title: "Move blocked", description: result.reason });
        return;
      }
    }

    const message = `${issue.identifier} moved from ${issue.status} to ${nextStatus}.`;
    setAnnouncement(message);
    toastManager.add({
      type: "success",
      title: `${issue.identifier} moved`,
      description: `${nextStatus} is now reflected in both project views.`,
    });
  };

  return (
    <>
      <BasePageShell
        actions={
          <Button onClick={() => openCreate()} size="sm">
            <PlusIcon />
            New issue
            <span className="font-mono text-[9px] opacity-65">C</span>
          </Button>
        }
        density="workspace"
        description="Move project work through delivery states while preserving workflow and run context."
        title="Board"
      >
        <div className="overflow-hidden rounded-lg border border-border/60 bg-background shadow-xs">
          <ProjectIssueViewBar
            layout="board"
            onRunView={(issueIds) => {
              setViewQueueIds(issueIds);
              setQueueOpen(true);
            }}
            visibleIssueIds={visibleIssues.map(({ id }) => id)}
          />
          <p aria-live="polite" className="sr-only">
            {announcement}
          </p>
          {visibleIssues.length === 0 ? (
            <div className="flex items-center justify-between gap-4 border-b border-border/60 bg-muted/10 px-3.5 py-3">
              <div>
                <p className="text-xs font-medium text-foreground/80">
                  {projectIssues.length === 0
                    ? `No issues in ${selectedProject.name} yet`
                    : "No issues match this board view"}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {projectIssues.length === 0
                    ? "Create project work before moving it through the workflow."
                    : "Clear the current filters to restore the project board."}
                </p>
              </div>
              {projectIssues.length > 0 && hasActiveIssueFilters(filters) ? (
                <Button
                  onClick={() => resetFilters(selectedProject.id)}
                  size="xs"
                  variant="outline"
                >
                  Clear filters
                </Button>
              ) : (
                <Button onClick={() => openCreate()} size="xs" variant="outline">
                  <PlusIcon />
                  New issue
                </Button>
              )}
            </div>
          ) : null}
          <DndContext collisionDetection={closestCenter} onDragEnd={moveIssue} sensors={sensors}>
            <div className="overflow-x-auto overscroll-x-contain">
              <div className="grid min-w-[1760px] grid-cols-8 divide-x divide-border/60">
                {BASE_ISSUE_STATUSES.map((status) => (
                  <BoardColumn
                    issues={visibleIssues.filter((issue) => issue.status === status)}
                    key={status}
                    onCreate={openCreate}
                    onOpenIssue={selectIssue}
                    runsByIssueId={runsByIssueId}
                    status={status}
                    workflowsById={workflowsById}
                  />
                ))}
              </div>
            </div>
          </DndContext>
          <div className="border-t border-border/60 px-3.5 py-2 text-[10px] text-muted-foreground">
            Dragging between columns applies guarded status transitions. Queueing remains explicit.
          </div>
        </div>
      </BasePageShell>

      <IssueCreateDialog
        initialStatus={createStatus}
        onOpenChange={setCreateOpen}
        open={createOpen}
      />
      <QueueIssuesDialog issueIds={viewQueueIds} onOpenChange={setQueueOpen} open={queueOpen} />
      <IssueInspector />
    </>
  );
}

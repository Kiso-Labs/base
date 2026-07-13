import {
  ArrowUpDownIcon,
  BookmarkIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  CircleDotDashedIcon,
  CircleIcon,
  CirclePauseIcon,
  CircleSlashIcon,
  EllipsisIcon,
  Layers3Icon,
  LoaderCircleIcon,
  MoreHorizontalIcon,
  InboxIcon,
  OctagonXIcon,
  PlayIcon,
  PlusIcon,
  SignalHighIcon,
  SignalLowIcon,
  SignalMediumIcon,
  SearchXIcon,
  WorkflowIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { cn } from "~/lib/utils";

import { BasePageShell } from "../BasePageShell";
import { useBaseWorkspace } from "../BaseWorkspaceContext";
import { IssueCreateDialog } from "../IssueCreateDialog";
import { IssueInspector } from "../IssueInspector";
import {
  DEFAULT_ISSUE_GROUP_BY,
  DEFAULT_ISSUE_FILTERS,
  filterIssues,
  groupIssues,
  hasActiveIssueFilters,
} from "../issueRepository";
import { useIssueWorkspaceStore } from "../issueWorkspaceStore";
import { ProjectIssueViewBar } from "../ProjectIssueViewBar";
import { QueueIssuesDialog } from "../QueueIssuesDialog";
import {
  BASE_ISSUE_STATUSES,
  type BaseIssueStatus,
  type BaseIssueSummary,
  type BasePriority,
  type BaseWorkflowSummary,
} from "../workspaceRepository";

const PRIORITY_ORDER = { Urgent: 0, High: 1, Medium: 2, Low: 3, None: 4 } as const;

interface IssueIconPresentation {
  readonly className: string;
  readonly Icon: LucideIcon;
  readonly label: string;
}

const STATUS_PRESENTATION = {
  Backlog: {
    className: "text-muted-foreground/60",
    Icon: CircleDashedIcon,
    label: "Backlog",
  },
  Planned: {
    className: "text-muted-foreground/60",
    Icon: CircleDotDashedIcon,
    label: "Planned",
  },
  Ready: { className: "text-muted-foreground/60", Icon: CircleIcon, label: "Ready" },
  Queued: { className: "text-warning", Icon: CirclePauseIcon, label: "Queued" },
  Running: { className: "text-info", Icon: LoaderCircleIcon, label: "In progress" },
  Blocked: {
    className: "text-destructive-foreground",
    Icon: OctagonXIcon,
    label: "Blocked",
  },
  Review: { className: "text-success", Icon: CircleSlashIcon, label: "In review" },
  Done: { className: "text-success", Icon: CircleCheckIcon, label: "Done" },
} as const satisfies Readonly<Record<BaseIssueStatus, IssueIconPresentation>>;

const PRIORITY_PRESENTATION = {
  Urgent: {
    className: "text-destructive-foreground",
    Icon: SignalHighIcon,
    label: "Urgent priority",
  },
  High: {
    className: "text-warning-foreground",
    Icon: SignalHighIcon,
    label: "High priority",
  },
  Medium: {
    className: "text-foreground/60",
    Icon: SignalMediumIcon,
    label: "Medium priority",
  },
  Low: {
    className: "text-muted-foreground/55",
    Icon: SignalLowIcon,
    label: "Low priority",
  },
  None: {
    className: "text-muted-foreground/55",
    Icon: EllipsisIcon,
    label: "No priority",
  },
} as const satisfies Readonly<Record<BasePriority, IssueIconPresentation>>;

const ISSUE_STATUS_KEYS = new Set<string>(BASE_ISSUE_STATUSES);

function isIssueStatus(value: string): value is BaseIssueStatus {
  return ISSUE_STATUS_KEYS.has(value);
}

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

function IssueStatusIcon({ status }: { readonly status: BaseIssueStatus }) {
  const { className, Icon, label } = STATUS_PRESENTATION[status];

  return <Icon aria-label={label} className={cn("size-4 shrink-0 stroke-[2.25]", className)} />;
}

function PriorityIcon({ priority }: { readonly priority: BasePriority }) {
  const { className, Icon, label } = PRIORITY_PRESENTATION[priority];

  return (
    <span
      aria-label={label}
      className={cn("flex size-4 shrink-0 items-center justify-center", className)}
    >
      <Icon aria-hidden="true" className="size-4" />
    </span>
  );
}

function StatusGroupHeader({
  count,
  status,
}: {
  readonly count: number;
  readonly status: BaseIssueStatus;
}) {
  return (
    <div className="flex h-10 items-center gap-2 border-y border-border/55 bg-muted/20 px-3.5 first:border-t-0">
      <IssueStatusIcon status={status} />
      <span className="text-xs font-medium text-foreground/85">
        {STATUS_PRESENTATION[status].label}
      </span>
      <span className="font-mono text-[11px] text-muted-foreground/65">{count}</span>
    </div>
  );
}

function PropertyGroupHeader({ count, label }: { readonly count: number; readonly label: string }) {
  return (
    <div className="flex h-10 items-center gap-2 border-y border-border/55 bg-muted/20 px-3.5 first:border-t-0">
      <Layers3Icon aria-hidden="true" className="size-4 text-muted-foreground/55" />
      <span className="text-xs font-medium text-foreground/85">{label}</span>
      <span className="font-mono text-[11px] text-muted-foreground/65">{count}</span>
    </div>
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
    <div
      className="group grid h-12 grid-cols-[2rem_1.25rem_minmax(13rem,1fr)_auto] items-center border-b border-border/45 px-2 transition-colors last:border-b-0 hover:bg-muted/30 data-[selected]:border-primary/10 data-[selected]:bg-primary/10 data-[selected]:hover:bg-primary/[0.13]"
      data-selected={selected || undefined}
      role="listitem"
    >
      <div className="flex items-center justify-center">
        <Checkbox
          aria-label={`Select ${issue.identifier}`}
          checked={selected}
          className={cn(
            "transition-opacity",
            selected
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
          )}
          onCheckedChange={(checked) => onSelectedChange(checked === true)}
        />
      </div>
      <PriorityIcon priority={issue.priority} />
      <div className="flex min-w-0 items-center">
        <button
          className="grid min-w-0 flex-1 grid-cols-[4.75rem_1.25rem_minmax(0,1fr)] items-center gap-1 text-left outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring"
          data-issue-id={issue.id}
          onClick={onOpen}
          type="button"
        >
          <span className="truncate font-mono text-[11px] font-medium text-muted-foreground/75">
            {issue.identifier}
          </span>
          <IssueStatusIcon status={issue.status} />
          <span className="truncate text-[13px] font-medium text-foreground/90">{issue.title}</span>
        </button>
      </div>

      <div className="ml-3 flex min-w-0 items-center justify-end gap-1.5">
        {issue.runState !== "idle" ? <RunStateBadge state={issue.runState} /> : null}
        {issue.labels.slice(0, 1).map((label) => (
          <Badge
            className="hidden max-w-28 truncate rounded-md bg-background/40 font-normal lg:inline-flex"
            key={label}
            size="sm"
            variant="outline"
          >
            {label}
          </Badge>
        ))}
        {workflow ? (
          <button
            className="hidden max-w-36 items-center gap-1.5 rounded-md border border-border/60 bg-background/35 px-2 py-1 text-left text-[10px] text-muted-foreground outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring xl:flex"
            onClick={onOpen}
            type="button"
          >
            <WorkflowIcon aria-hidden="true" className="size-3 shrink-0" />
            <span className="truncate">{workflow.name}</span>
          </button>
        ) : null}
        <span
          aria-label={issue.assignee}
          className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background text-[9px] font-semibold text-muted-foreground"
          title={issue.assignee}
        >
          {assigneeInitial}
        </span>
        <span className="hidden w-12 text-right text-[10px] text-muted-foreground/70 sm:block">
          {issue.updatedAt}
        </span>
        <div className="w-6">
          <Button
            aria-label={`Open ${issue.identifier}`}
            className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
            onClick={onOpen}
            size="icon-xs"
            variant="ghost"
          >
            <MoreHorizontalIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}

function IssuesEmptyState({
  activeViewName,
  hasProjectIssues,
  onClearFilters,
  onCreateIssue,
  onViewAll,
  projectName,
}: {
  readonly activeViewName: string | null;
  readonly hasProjectIssues: boolean;
  readonly onClearFilters: () => void;
  readonly onCreateIssue: () => void;
  readonly onViewAll: () => void;
  readonly projectName: string;
}) {
  if (!hasProjectIssues) {
    return (
      <Empty className="min-h-72">
        <EmptyMedia variant="icon">
          <InboxIcon />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle className="text-base">Start planning {projectName}</EmptyTitle>
          <EmptyDescription className="max-w-xs text-xs leading-relaxed">
            This project has no issues yet. Create the first issue to start building its backlog and
            workflow queue.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={onCreateIssue} size="sm">
            <PlusIcon />
            Create first issue
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  if (activeViewName) {
    return (
      <Empty className="min-h-72">
        <EmptyMedia variant="icon">
          <BookmarkIcon />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle className="text-base">No issues in {activeViewName}</EmptyTitle>
          <EmptyDescription className="max-w-sm text-xs leading-relaxed">
            This project view is live, so issues will appear here when they match its saved filters.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row justify-center gap-2">
          <Button onClick={onViewAll} size="sm" variant="outline">
            View all issues
          </Button>
          <Button onClick={onCreateIssue} size="sm">
            <PlusIcon />
            New issue
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <Empty className="min-h-72">
      <EmptyMedia variant="icon">
        <SearchXIcon />
      </EmptyMedia>
      <EmptyHeader>
        <EmptyTitle className="text-base">No matching issues</EmptyTitle>
        <EmptyDescription className="max-w-sm text-xs leading-relaxed">
          The project has issues, but none match the current search and filters.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onClearFilters} size="sm" variant="outline">
          <XIcon />
          Clear filters
        </Button>
      </EmptyContent>
    </Empty>
  );
}

export function IssuesPage() {
  const { selectedProject, snapshot } = useBaseWorkspace();
  const filters = useIssueWorkspaceStore(
    (state) => state.filtersByProject[selectedProject.id] ?? DEFAULT_ISSUE_FILTERS,
  );
  const selectedIssueIds = useIssueWorkspaceStore((state) => state.selectedIssueIds);
  const groupBy = useIssueWorkspaceStore(
    (state) => state.groupByByProject[selectedProject.id] ?? DEFAULT_ISSUE_GROUP_BY,
  );
  const views = useIssueWorkspaceStore((state) => state.views);
  const activeViewId = useIssueWorkspaceStore(
    (state) => state.activeViewIdByProject[selectedProject.id] ?? null,
  );
  const toggleIssueSelection = useIssueWorkspaceStore((state) => state.toggleIssueSelection);
  const setIssueSelection = useIssueWorkspaceStore((state) => state.setIssueSelection);
  const clearIssueSelection = useIssueWorkspaceStore((state) => state.clearIssueSelection);
  const selectIssue = useIssueWorkspaceStore((state) => state.selectIssue);
  const uiIntent = useIssueWorkspaceStore((state) => state.uiIntent);
  const consumeUiIntent = useIssueWorkspaceStore((state) => state.consumeUiIntent);
  const activateView = useIssueWorkspaceStore((state) => state.activateView);
  const resetFilters = useIssueWorkspaceStore((state) => state.resetFilters);
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
  const activeView = views.find(
    (view) => view.id === activeViewId && view.projectId === selectedProject.id,
  );
  const allIssuesView = views.find(
    (view) =>
      view.projectId === selectedProject.id &&
      view.kind === "system" &&
      view.layout === "list" &&
      !hasActiveIssueFilters(view.filters),
  );

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
        density="canvas"
        description="Plan work, attach reusable workflows, and keep execution history inside this project."
        showIntro={false}
        title="Issues"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-b border-border/70 bg-background">
          <ProjectIssueViewBar
            layout="list"
            onRunView={(issueIds) => {
              clearIssueSelection();
              setIssueSelection(issueIds, true);
              setQueueOpen(true);
            }}
            visibleIssueIds={visibleIssueIds}
          />
          <div className="flex h-9 items-center justify-end gap-1 border-b border-border/60 px-2">
            {selectedIssueIds.length > 0 ? (
              <>
                <span className="mr-auto pl-1.5 text-xs font-medium">
                  {selectedIssueIds.length} selected
                </span>
                <Button onClick={() => setQueueOpen(true)} size="xs" variant="secondary">
                  <PlayIcon />
                  Queue
                </Button>
                <Button onClick={clearIssueSelection} size="xs" variant="ghost">
                  <XIcon />
                  Clear
                </Button>
              </>
            ) : (
              <>
                <Checkbox
                  aria-label="Select all visible issues"
                  checked={allVisibleSelected}
                  className="mr-1"
                  onCheckedChange={(checked) =>
                    setIssueSelection(visibleIssueIds, checked === true)
                  }
                />
                <Button
                  onClick={() =>
                    setSort((current) => (current === "updated" ? "priority" : "updated"))
                  }
                  size="xs"
                  variant="ghost"
                >
                  <ArrowUpDownIcon />
                  Sort: {sort === "updated" ? "Updated" : "Priority"}
                </Button>
              </>
            )}
            <Button onClick={() => setCreateOpen(true)} size="xs">
              <PlusIcon />
              New issue
              <span className="font-mono text-[9px] opacity-65">C</span>
            </Button>
          </div>

          <div
            className="min-h-0 flex-1 overflow-y-auto"
            role={visibleIssues.length > 0 ? "list" : undefined}
          >
            {visibleGroups.map((group) => (
              <Fragment key={group.key}>
                {groupBy === "status" ? (
                  isIssueStatus(group.key) ? (
                    <StatusGroupHeader count={group.issues.length} status={group.key} />
                  ) : null
                ) : groupBy !== "none" ? (
                  <PropertyGroupHeader
                    count={group.issues.length}
                    label={
                      groupBy === "workflow"
                        ? (workflowsById.get(group.key)?.name ?? group.key)
                        : group.key
                    }
                  />
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
              <IssuesEmptyState
                activeViewName={projectIssues.length > 0 ? (activeView?.name ?? null) : null}
                hasProjectIssues={projectIssues.length > 0}
                onClearFilters={() => resetFilters(selectedProject.id)}
                onCreateIssue={() => setCreateOpen(true)}
                onViewAll={() => {
                  if (allIssuesView) activateView(selectedProject.id, allIssuesView.id);
                  else resetFilters(selectedProject.id);
                }}
                projectName={selectedProject.name}
              />
            ) : null}
          </div>
        </div>
      </BasePageShell>

      <IssueCreateDialog onOpenChange={setCreateOpen} open={createOpen} />
      <QueueIssuesDialog issueIds={selectedIssueIds} onOpenChange={setQueueOpen} open={queueOpen} />
      <IssueInspector />
    </>
  );
}

import type {
  BaseIssueStatus,
  BaseIssueSummary,
  BasePriority,
  BaseProject,
  BaseRepository,
  BaseRunSummary,
  BaseWorkspaceSnapshot,
} from "./workspaceRepository";

export interface IssueFilters {
  readonly search: string;
  readonly status: "all" | BaseIssueStatus;
  readonly priority: "all" | BasePriority;
  readonly label: "all" | string;
  readonly module: "all" | string;
  readonly cycle: "all" | string;
  readonly assignee: "all" | string;
  readonly workflow: "all" | "assigned" | "unassigned" | string;
  readonly runState: "all" | "active" | BaseIssueSummary["runState"];
}

export type IssueViewLayout = "list" | "board";
export type IssueViewGroupBy =
  | "none"
  | "status"
  | "priority"
  | "assignee"
  | "workflow"
  | "module"
  | "cycle";

export const ISSUE_VIEW_GROUP_OPTIONS: readonly {
  readonly label: string;
  readonly value: IssueViewGroupBy;
}[] = [
  { label: "No grouping", value: "none" },
  { label: "Status", value: "status" },
  { label: "Priority", value: "priority" },
  { label: "Assignee", value: "assignee" },
  { label: "Workflow", value: "workflow" },
  { label: "Module", value: "module" },
  { label: "Cycle", value: "cycle" },
];

export function issueViewPath(layout: IssueViewLayout): "/board" | "/issues" {
  return layout === "board" ? "/board" : "/issues";
}

export const DEFAULT_ISSUE_GROUP_BY = "status" as const satisfies IssueViewGroupBy;

export interface BaseIssueView {
  readonly id: string;
  readonly projectId: string;
  readonly kind: "system" | "saved";
  readonly name: string;
  readonly description?: string;
  readonly layout: IssueViewLayout;
  readonly groupBy: IssueViewGroupBy;
  readonly filters: IssueFilters;
}

export interface IssueDraft {
  readonly title: string;
  readonly description: string;
  readonly status: "Backlog" | "Planned" | "Ready";
  readonly priority: BasePriority;
  readonly labels: readonly string[];
  readonly module: string;
  readonly cycle: string;
  readonly assignee: string;
  readonly workflowId: string | null;
}

export interface BaseIssueTemplate {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly defaults: Omit<IssueDraft, "title">;
}

export interface IssueGroup {
  readonly key: string;
  readonly issues: readonly BaseIssueSummary[];
}

export const DEFAULT_ISSUE_FILTERS: IssueFilters = {
  search: "",
  status: "all",
  priority: "all",
  label: "all",
  module: "all",
  cycle: "all",
  assignee: "all",
  workflow: "all",
  runState: "all",
};

export function hasActiveIssueFilters(filters: IssueFilters): boolean {
  return (
    filters.search.trim().length > 0 ||
    filters.status !== "all" ||
    filters.priority !== "all" ||
    filters.label !== "all" ||
    filters.module !== "all" ||
    filters.cycle !== "all" ||
    filters.assignee !== "all" ||
    filters.workflow !== "all" ||
    filters.runState !== "all"
  );
}

export const BASE_ISSUE_TEMPLATES: readonly BaseIssueTemplate[] = [
  {
    id: "issue-template-bug",
    name: "Bug report",
    description: "Capture a reproducible defect and send it through regression-safe delivery.",
    defaults: {
      description:
        "## What happened\n\nDescribe the observed behavior.\n\n## Expected behavior\n\nDescribe what should happen instead.\n\n## Reproduction\n\n1. ",
      status: "Planned",
      priority: "High",
      labels: ["bug", "regression"],
      module: "",
      cycle: "",
      assignee: "",
      workflowId: "workflow-bug-fix",
    },
  },
  {
    id: "issue-template-feature",
    name: "Feature delivery",
    description: "Frame a product outcome, acceptance criteria, and reliable delivery workflow.",
    defaults: {
      description:
        "## Outcome\n\nWhat should become possible?\n\n## Acceptance criteria\n\n- [ ] \n\n## Constraints\n\n",
      status: "Planned",
      priority: "Medium",
      labels: ["feature"],
      module: "",
      cycle: "",
      assignee: "Planning Agent",
      workflowId: "workflow-reliable-feature-delivery",
    },
  },
  {
    id: "issue-template-maintenance",
    name: "Maintenance",
    description: "Plan repository upkeep with a lightweight safety workflow.",
    defaults: {
      description:
        "## Maintenance task\n\nDescribe the cleanup or operational work.\n\n## Verification\n\n- [ ] Checks remain green",
      status: "Backlog",
      priority: "Low",
      labels: ["maintenance"],
      module: "Repository safety",
      cycle: "",
      assignee: "",
      workflowId: "workflow-pre-push-review",
    },
  },
] as const;

const STATUS_GROUP_ORDER: readonly BaseIssueStatus[] = [
  "Backlog",
  "Planned",
  "Ready",
  "Queued",
  "Running",
  "Blocked",
  "Review",
  "Done",
];

const PRIORITY_GROUP_ORDER: readonly BasePriority[] = ["Urgent", "High", "Medium", "Low", "None"];

export interface IssueRepositoryState {
  readonly issues: readonly BaseIssueSummary[];
  readonly runs: readonly BaseRunSummary[];
  readonly workflowIds: readonly string[];
  readonly workflowVersionById: Readonly<Record<string, number | null>>;
  readonly workflowExecutableById: Readonly<Record<string, boolean>>;
  readonly workflowNameById: Readonly<Record<string, string>>;
  readonly nextIssueNumberByProject: Readonly<Record<string, number>>;
  readonly nextRunNumber: number;
}

export interface CreateIssueInput {
  readonly project: BaseProject;
  readonly repository: BaseRepository;
  readonly title: string;
  readonly status?: BaseIssueStatus;
  readonly description?: string;
  readonly priority?: BasePriority;
  readonly labels?: readonly string[];
  readonly module?: string;
  readonly cycle?: string;
  readonly assignee?: string;
  readonly workflowId?: string | null;
}

export interface UpdateIssueInput {
  readonly title?: string;
  readonly description?: string;
  readonly priority?: BasePriority;
  readonly labels?: readonly string[];
  readonly module?: string;
  readonly cycle?: string;
  readonly assignee?: string;
  readonly branch?: string;
  readonly dependencies?: readonly string[];
}

export interface CreateIssueResult {
  readonly state: IssueRepositoryState;
  readonly issue: BaseIssueSummary;
}

export interface QueueIssuesResult {
  readonly state: IssueRepositoryState;
  readonly queuedIds: readonly string[];
  readonly rejected: readonly { readonly issueId: string; readonly reason: string }[];
}

export type IssueTransitionResult =
  | {
      readonly ok: true;
      readonly state: IssueRepositoryState;
      readonly issue: BaseIssueSummary;
    }
  | {
      readonly ok: false;
      readonly state: IssueRepositoryState;
      readonly reason: string;
    };

export type IssueMutationResult = IssueTransitionResult;

const ALLOWED_STATUS_TRANSITIONS: Record<BaseIssueStatus, readonly BaseIssueStatus[]> = {
  Backlog: ["Planned", "Blocked"],
  Planned: ["Backlog", "Ready", "Blocked"],
  Ready: ["Planned", "Blocked"],
  Queued: ["Running", "Blocked"],
  Running: ["Blocked", "Review"],
  Blocked: ["Ready"],
  Review: ["Ready", "Blocked", "Done"],
  Done: ["Ready"],
};

const INVALID_TRANSITION_REASONS: Record<BaseIssueStatus, string> = {
  Backlog: "Backlog issues must be planned before they can move forward.",
  Planned: "Planned issues can only return to Backlog, become Ready, or be blocked.",
  Ready: "Ready issues must be queued through an attached workflow before execution.",
  Queued: "Queued issues can only start running or become blocked.",
  Running: "Running issues can only move to Blocked or Review.",
  Blocked: "Blocked issues can only resume their prior status or return to Ready.",
  Review: "Issues in review can return to Ready, become blocked, or be completed.",
  Done: "Completed issues must reopen in Ready.",
};

function nextIssueNumbersByProject(
  issues: readonly BaseIssueSummary[],
): Readonly<Record<string, number>> {
  const highestByProject: Record<string, number> = {};
  for (const issue of issues) {
    const number = Number(issue.identifier.split("-").at(-1));
    if (!Number.isSafeInteger(number)) continue;
    highestByProject[issue.projectId] = Math.max(highestByProject[issue.projectId] ?? 0, number);
  }
  return Object.fromEntries(
    Object.entries(highestByProject).map(([projectId, highest]) => [projectId, highest + 1]),
  );
}

function nextRunNumber(runs: readonly BaseRunSummary[]): number {
  return (
    runs.reduce((highest, run) => {
      const number = Number(run.id.split("-").at(-1));
      return Number.isSafeInteger(number) ? Math.max(highest, number) : highest;
    }, 0) + 1
  );
}

function uniqueCleanStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function createIssueRepositoryState(snapshot: BaseWorkspaceSnapshot): IssueRepositoryState {
  return {
    issues: snapshot.issues,
    runs: snapshot.runs,
    workflowIds: snapshot.workflows.map(({ id }) => id),
    workflowVersionById: Object.fromEntries(
      snapshot.workflows.map(({ id, version }) => [id, version > 0 ? version : null]),
    ),
    workflowExecutableById: Object.fromEntries(snapshot.workflows.map(({ id }) => [id, true])),
    workflowNameById: Object.fromEntries(snapshot.workflows.map(({ id, name }) => [id, name])),
    nextIssueNumberByProject: nextIssueNumbersByProject(snapshot.issues),
    nextRunNumber: nextRunNumber(snapshot.runs),
  };
}

export function filterIssues(
  issues: readonly BaseIssueSummary[],
  projectId: string,
  filters: IssueFilters,
): readonly BaseIssueSummary[] {
  const searchTerms = filters.search.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);

  return issues.filter((issue) => {
    if (issue.projectId !== projectId) return false;
    const searchText = [
      issue.identifier,
      issue.title,
      issue.description,
      issue.assignee,
      issue.module,
      issue.cycle,
      ...issue.labels,
    ]
      .join(" ")
      .toLocaleLowerCase();

    return (
      searchTerms.every((term) => searchText.includes(term)) &&
      (filters.status === "all" || issue.status === filters.status) &&
      (filters.priority === "all" || issue.priority === filters.priority) &&
      (filters.label === "all" || issue.labels.includes(filters.label)) &&
      (filters.module === "all" || issue.module === filters.module) &&
      (filters.cycle === "all" || issue.cycle === filters.cycle) &&
      (filters.assignee === "all" || issue.assignee === filters.assignee) &&
      (filters.runState === "all" ||
        (filters.runState === "active" && issue.runState !== "idle") ||
        issue.runState === filters.runState) &&
      (filters.workflow === "all" ||
        (filters.workflow === "assigned" && issue.workflowId !== null) ||
        (filters.workflow === "unassigned" && issue.workflowId === null) ||
        issue.workflowId === filters.workflow)
    );
  });
}

export function createDefaultIssueViews(
  projects: readonly BaseProject[],
): readonly BaseIssueView[] {
  return projects.flatMap((project) => [
    {
      id: `view-${project.id}-all`,
      projectId: project.id,
      kind: "system" as const,
      name: "All issues",
      layout: "list" as const,
      groupBy: DEFAULT_ISSUE_GROUP_BY,
      filters: DEFAULT_ISSUE_FILTERS,
    },
    {
      id: `view-${project.id}-active`,
      projectId: project.id,
      kind: "system" as const,
      name: "Active work",
      layout: "board" as const,
      groupBy: "status" as const,
      filters: { ...DEFAULT_ISSUE_FILTERS, runState: "active" as const },
    },
    {
      id: `view-${project.id}-ready`,
      projectId: project.id,
      kind: "system" as const,
      name: "Ready to run",
      layout: "list" as const,
      groupBy: "workflow" as const,
      filters: { ...DEFAULT_ISSUE_FILTERS, status: "Ready" as const },
    },
    {
      id: `view-${project.id}-unassigned`,
      projectId: project.id,
      kind: "system" as const,
      name: "Unassigned",
      layout: "list" as const,
      groupBy: "priority" as const,
      filters: { ...DEFAULT_ISSUE_FILTERS, assignee: "Unassigned" },
    },
  ]);
}

export function createIssueView(
  views: readonly BaseIssueView[],
  input: Omit<BaseIssueView, "id" | "kind">,
): BaseIssueView {
  const name = input.name.trim() || "Untitled view";
  const slug =
    name
      .toLocaleLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "view";
  const matchingIds = new Set(views.map(({ id }) => id));
  let id = `view-${input.projectId}-${slug}`;
  let suffix = 2;
  while (matchingIds.has(id)) {
    id = `view-${input.projectId}-${slug}-${suffix}`;
    suffix += 1;
  }
  return { ...input, id, kind: "saved" };
}

export function resolveIssueView(
  issues: readonly BaseIssueSummary[],
  view: BaseIssueView,
): readonly BaseIssueSummary[] {
  return filterIssues(issues, view.projectId, view.filters);
}

function issueGroupKey(issue: BaseIssueSummary, groupBy: IssueViewGroupBy): string {
  if (groupBy === "none") return "All issues";
  if (groupBy === "workflow") return issue.workflowId ?? "No workflow";
  return issue[groupBy] || `No ${groupBy}`;
}

export function groupIssues(
  issues: readonly BaseIssueSummary[],
  groupBy: IssueViewGroupBy,
): readonly IssueGroup[] {
  if (groupBy === "none") return [{ key: "All issues", issues }];

  const grouped = new Map<string, BaseIssueSummary[]>();
  for (const issue of issues) {
    const key = issueGroupKey(issue, groupBy);
    const group = grouped.get(key);
    if (group) group.push(issue);
    else grouped.set(key, [issue]);
  }
  const order =
    groupBy === "status" ? STATUS_GROUP_ORDER : groupBy === "priority" ? PRIORITY_GROUP_ORDER : [];
  const orderByKey = new Map<string, number>(order.map((value, index) => [value, index]));

  return [...grouped.entries()]
    .toSorted(([left], [right]) => {
      const leftOrder = orderByKey.get(left) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = orderByKey.get(right) ?? Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder || left.localeCompare(right);
    })
    .map(([key, group]) => ({ key, issues: group }));
}

export function applyIssueTemplate(draft: IssueDraft, template: BaseIssueTemplate): IssueDraft {
  return { ...draft, ...template.defaults, title: draft.title };
}

export function canTransitionIssue(
  issue: BaseIssueSummary,
  nextStatus: BaseIssueStatus,
): { readonly allowed: true } | { readonly allowed: false; readonly reason: string } {
  if (issue.status === nextStatus) {
    return { allowed: false, reason: `${issue.identifier} is already ${nextStatus}.` };
  }
  const allowedStatuses =
    issue.status === "Blocked" && issue.blockedFromStatus
      ? [...ALLOWED_STATUS_TRANSITIONS.Blocked, issue.blockedFromStatus]
      : ALLOWED_STATUS_TRANSITIONS[issue.status];
  return allowedStatuses.includes(nextStatus)
    ? { allowed: true }
    : { allowed: false, reason: INVALID_TRANSITION_REASONS[issue.status] };
}

export function transitionIssue(
  state: IssueRepositoryState,
  issueId: string,
  nextStatus: BaseIssueStatus,
): IssueTransitionResult {
  const issue = state.issues.find(({ id }) => id === issueId);
  if (!issue) {
    return { ok: false, state, reason: "The issue no longer exists." };
  }
  const decision = canTransitionIssue(issue, nextStatus);
  if (!decision.allowed) {
    return { ok: false, state, reason: decision.reason };
  }

  const nextIssue: BaseIssueSummary = {
    ...issue,
    status: nextStatus,
    blockedFromStatus:
      nextStatus === "Blocked"
        ? issue.status
        : issue.status === "Blocked"
          ? null
          : issue.blockedFromStatus,
    runState:
      nextStatus === "Running"
        ? "running"
        : nextStatus === "Review"
          ? "review"
          : nextStatus === "Queued"
            ? "queued"
            : "idle",
    queuePosition: nextStatus === "Queued" ? issue.queuePosition : null,
    updatedAt: "Just now",
    activity: [
      ...issue.activity,
      {
        id: `${issue.id}-activity-${issue.activity.length + 1}`,
        label: `Moved from ${issue.status} to ${nextStatus}`,
        createdAt: "Just now",
      },
    ],
  };
  const runUpdate =
    nextStatus === "Running"
      ? ({ status: "Running", currentStep: "Agent execution" } as const)
      : nextStatus === "Review"
        ? ({ status: "Waiting", currentStep: "Human review" } as const)
        : nextStatus === "Done"
          ? ({ status: "Succeeded", currentStep: "Completed" } as const)
          : nextStatus === "Blocked"
            ? ({ status: "Failed", currentStep: "Blocked" } as const)
            : null;

  return {
    ok: true,
    issue: nextIssue,
    state: {
      ...state,
      issues: state.issues.map((candidate) => (candidate.id === issueId ? nextIssue : candidate)),
      runs:
        runUpdate && issue.latestRunId
          ? state.runs.map((run) => (run.id === issue.latestRunId ? { ...run, ...runUpdate } : run))
          : state.runs,
    },
  };
}

export function assignIssueWorkflow(
  state: IssueRepositoryState,
  issueId: string,
  workflowId: string | null,
): IssueMutationResult {
  const issue = state.issues.find(({ id }) => id === issueId);
  if (!issue) {
    return { ok: false, state, reason: "The issue no longer exists." };
  }
  if (workflowId && !state.workflowIds.includes(workflowId)) {
    return {
      ok: false,
      state,
      reason: "The selected workflow template no longer exists.",
    };
  }
  if (issue.status === "Queued" || issue.status === "Running" || issue.runState === "queued") {
    return {
      ok: false,
      state,
      reason: `Dequeue ${issue.identifier} before changing its workflow.`,
    };
  }

  const nextIssue: BaseIssueSummary = {
    ...issue,
    workflowId,
    updatedAt: "Just now",
    activity: [
      ...issue.activity,
      {
        id: `${issue.id}-activity-${issue.activity.length + 1}`,
        label: workflowId ? "Workflow assigned" : "Workflow removed",
        createdAt: "Just now",
      },
    ],
  };
  return {
    ok: true,
    issue: nextIssue,
    state: {
      ...state,
      issues: state.issues.map((candidate) => (candidate.id === issueId ? nextIssue : candidate)),
    },
  };
}

export function queueIssues(
  state: IssueRepositoryState,
  issueIds: readonly string[],
  workflowIdOverride?: string,
): QueueIssuesResult {
  if (workflowIdOverride && !state.workflowIds.includes(workflowIdOverride)) {
    return {
      state,
      queuedIds: [],
      rejected: issueIds.map((issueId) => ({
        issueId,
        reason: "The selected workflow template no longer exists.",
      })),
    };
  }
  const issues = [...state.issues];
  const runs = [...state.runs];
  const issueIndexById = new Map(issues.map((issue, index) => [issue.id, index]));
  const nextQueuePositionByProject = new Map<string, number>();
  for (const issue of issues) {
    nextQueuePositionByProject.set(
      issue.projectId,
      Math.max(nextQueuePositionByProject.get(issue.projectId) ?? 0, issue.queuePosition ?? 0),
    );
  }
  let nextRunNumber = state.nextRunNumber;
  const queuedIds: string[] = [];
  const rejected: Array<{ issueId: string; reason: string }> = [];

  for (const issueId of issueIds) {
    const issueIndex = issueIndexById.get(issueId);
    if (issueIndex === undefined) {
      rejected.push({ issueId, reason: "The issue no longer exists." });
      continue;
    }
    const issue = issues[issueIndex]!;
    if (issue.status === "Queued" || issue.runState === "queued") {
      rejected.push({ issueId, reason: `${issue.identifier} is already queued for execution.` });
      continue;
    }
    if (issue.status === "Running" || issue.runState === "running") {
      rejected.push({ issueId, reason: `${issue.identifier} is already running.` });
      continue;
    }
    const runWorkflowId = workflowIdOverride ?? issue.workflowId;
    if (!runWorkflowId) {
      rejected.push({
        issueId,
        reason: `Attach a workflow to ${issue.identifier} before queueing it.`,
      });
      continue;
    }
    if (!state.workflowIds.includes(runWorkflowId)) {
      rejected.push({
        issueId,
        reason: "The selected workflow template no longer exists.",
      });
      continue;
    }
    if (state.workflowExecutableById[runWorkflowId] === false) {
      rejected.push({
        issueId,
        reason: `Restore the archived workflow assigned to ${issue.identifier} before queueing it.`,
      });
      continue;
    }
    const workflowVersion = state.workflowVersionById[runWorkflowId];
    if (workflowVersion === null || workflowVersion === undefined) {
      rejected.push({
        issueId,
        reason: `Publish the workflow assigned to ${issue.identifier} before queueing it.`,
      });
      continue;
    }
    if (issue.status !== "Ready") {
      rejected.push({
        issueId,
        reason: `${issue.identifier} must be Ready before it can be queued.`,
      });
      continue;
    }

    const queuePosition = (nextQueuePositionByProject.get(issue.projectId) ?? 0) + 1;
    nextQueuePositionByProject.set(issue.projectId, queuePosition);
    const runId = `RUN-${nextRunNumber}`;
    const nextIssue: BaseIssueSummary = {
      ...issue,
      status: "Queued",
      runState: "queued",
      queuePosition,
      latestRunId: runId,
      blockedFromStatus: null,
      updatedAt: "Just now",
      activity: [
        ...issue.activity,
        {
          id: `${issue.id}-activity-${issue.activity.length + 1}`,
          label: `Queued for execution at position ${queuePosition}`,
          createdAt: "Just now",
        },
      ],
    };
    const run: BaseRunSummary = {
      id: runId,
      projectId: issue.projectId,
      workflowId: runWorkflowId,
      workflowVersionId: `${runWorkflowId}:v${workflowVersion}`,
      workflowVersion,
      workflowName: state.workflowNameById[runWorkflowId] ?? runWorkflowId,
      issueId: issue.id,
      status: "Queued",
      currentStep: "Waiting for capacity",
      startedAt: "Just now",
      duration: "—",
    };
    issues[issueIndex] = nextIssue;
    runs.push(run);
    nextRunNumber += 1;
    queuedIds.push(issueId);
  }

  return {
    state: { ...state, issues, runs, nextRunNumber },
    queuedIds,
    rejected,
  };
}

export function queueIssueView(
  state: IssueRepositoryState,
  view: BaseIssueView,
  workflowIdOverride?: string,
): QueueIssuesResult {
  const issueIds = resolveIssueView(state.issues, view).map(({ id }) => id);
  return queueIssues(state, issueIds, workflowIdOverride);
}

export function updateIssue(
  state: IssueRepositoryState,
  issueId: string,
  input: UpdateIssueInput,
): IssueMutationResult {
  const issue = state.issues.find(({ id }) => id === issueId);
  if (!issue) {
    return { ok: false, state, reason: "The issue no longer exists." };
  }
  const title = input.title === undefined ? issue.title : input.title.trim();
  if (!title) {
    return { ok: false, state, reason: "Issue title is required." };
  }
  const projectDependencyIds = new Set(
    state.issues
      .filter((candidate) => candidate.projectId === issue.projectId && candidate.id !== issue.id)
      .map(({ id }) => id),
  );

  const nextIssue: BaseIssueSummary = {
    ...issue,
    title,
    description: input.description?.trim() ?? issue.description,
    priority: input.priority ?? issue.priority,
    labels: input.labels ? uniqueCleanStrings(input.labels) : issue.labels,
    module: input.module?.trim() || issue.module,
    cycle: input.cycle?.trim() || issue.cycle,
    assignee: input.assignee?.trim() || issue.assignee,
    branch: input.branch?.trim() || issue.branch,
    dependencies: input.dependencies
      ? uniqueCleanStrings(input.dependencies).filter((dependency) =>
          projectDependencyIds.has(dependency),
        )
      : issue.dependencies,
    updatedAt: "Just now",
    activity: [
      ...issue.activity,
      {
        id: `${issue.id}-activity-${issue.activity.length + 1}`,
        label: "Issue details updated",
        createdAt: "Just now",
      },
    ],
  };
  return {
    ok: true,
    issue: nextIssue,
    state: {
      ...state,
      issues: state.issues.map((candidate) => (candidate.id === issueId ? nextIssue : candidate)),
    },
  };
}

export function dequeueIssue(state: IssueRepositoryState, issueId: string): IssueMutationResult {
  const issue = state.issues.find(({ id }) => id === issueId);
  if (!issue) {
    return { ok: false, state, reason: "The issue no longer exists." };
  }
  if (issue.status !== "Queued" || issue.runState !== "queued") {
    return { ok: false, state, reason: `${issue.identifier} is not currently queued.` };
  }

  const nextIssue: BaseIssueSummary = {
    ...issue,
    status: "Ready",
    runState: "idle",
    queuePosition: null,
    updatedAt: "Just now",
    activity: [
      ...issue.activity,
      {
        id: `${issue.id}-activity-${issue.activity.length + 1}`,
        label: "Dequeued and returned to Ready",
        createdAt: "Just now",
      },
    ],
  };
  return {
    ok: true,
    issue: nextIssue,
    state: {
      ...state,
      issues: state.issues.map((candidate) => (candidate.id === issueId ? nextIssue : candidate)),
      runs: state.runs.map((run) =>
        run.id === issue.latestRunId && run.status === "Queued"
          ? { ...run, status: "Failed", currentStep: "Dequeued before execution" }
          : run,
      ),
    },
  };
}

export function createIssue(
  state: IssueRepositoryState,
  input: CreateIssueInput,
): CreateIssueResult {
  const title = input.title.trim();
  if (!title) throw new Error("Issue title is required.");
  if (input.project.repositoryId !== input.repository.id) {
    throw new Error("The selected repository does not belong to this project.");
  }
  if (input.workflowId && !state.workflowIds.includes(input.workflowId)) {
    throw new Error("The selected workflow template no longer exists.");
  }
  const issueNumber = state.nextIssueNumberByProject[input.project.id] ?? 1;
  const identifier = `${input.project.identifier}-${issueNumber}`;
  const issue: BaseIssueSummary = {
    id: `issue-${identifier.toLocaleLowerCase()}`,
    projectId: input.project.id,
    repositoryId: input.repository.id,
    identifier,
    title,
    description: input.description?.trim() ?? "",
    status: input.status ?? "Backlog",
    priority: input.priority ?? "None",
    labels: input.labels ? uniqueCleanStrings(input.labels) : [],
    module: input.module?.trim() || "Unassigned",
    cycle: input.cycle?.trim() || "Unscheduled",
    assignee: input.assignee?.trim() || "Unassigned",
    branch: input.repository.defaultBranch,
    dependencies: [],
    workflowId: input.workflowId ?? null,
    runState: "idle",
    queuePosition: null,
    latestRunId: null,
    blockedFromStatus: null,
    activity: [
      {
        id: `${identifier}-created`,
        label: "Issue created",
        createdAt: "Just now",
      },
    ],
    updatedAt: "Just now",
  };

  return {
    issue,
    state: {
      ...state,
      issues: [...state.issues, issue],
      nextIssueNumberByProject: {
        ...state.nextIssueNumberByProject,
        [input.project.id]: issueNumber + 1,
      },
    },
  };
}

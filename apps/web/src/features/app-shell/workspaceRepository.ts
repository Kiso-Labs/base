export type BaseIssueStatus =
  | "Backlog"
  | "Planned"
  | "Ready"
  | "Queued"
  | "Running"
  | "Blocked"
  | "Review"
  | "Done";

export const BASE_ISSUE_STATUSES = [
  "Backlog",
  "Planned",
  "Ready",
  "Queued",
  "Running",
  "Blocked",
  "Review",
  "Done",
] as const satisfies readonly BaseIssueStatus[];

export type BasePriority = "Urgent" | "High" | "Medium" | "Low" | "None";

export const BASE_PRIORITIES = [
  "Urgent",
  "High",
  "Medium",
  "Low",
  "None",
] as const satisfies readonly BasePriority[];

export interface BaseIssueActivity {
  readonly id: string;
  readonly label: string;
  readonly createdAt: string;
}

export interface BaseWorkspace {
  readonly id: string;
  readonly name: string;
}

export interface BaseRepository {
  readonly id: string;
  readonly fullName: string;
  readonly defaultBranch: string;
  readonly remoteUrl: string;
}

export interface BaseProject {
  readonly id: string;
  readonly workspaceId: string;
  readonly repositoryId: string;
  readonly name: string;
  readonly identifier: string;
}

export interface BaseIssueSummary {
  readonly id: string;
  readonly projectId: string;
  readonly identifier: string;
  readonly title: string;
  readonly description: string;
  readonly status: BaseIssueStatus;
  readonly priority: BasePriority;
  readonly labels: readonly string[];
  readonly module: string;
  readonly cycle: string;
  readonly assignee: string;
  readonly repositoryId: string;
  readonly branch: string;
  readonly dependencies: readonly string[];
  readonly workflowId: string | null;
  readonly runState: "idle" | "queued" | "running" | "review";
  readonly queuePosition: number | null;
  readonly latestRunId: string | null;
  readonly blockedFromStatus: BaseIssueStatus | null;
  readonly activity: readonly BaseIssueActivity[];
  readonly updatedAt: string;
}

export interface BaseWorkflowSummary {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly trigger: string;
  readonly status: "Draft" | "Published";
  readonly version: number;
  readonly successRate: number | null;
}

export interface BaseRunSummary {
  readonly id: string;
  readonly projectId: string;
  readonly workflowId: string;
  readonly workflowVersionId: string;
  readonly workflowVersion: number;
  readonly issueId: string;
  readonly status: "Queued" | "Running" | "Waiting" | "Failed" | "Succeeded";
  readonly currentStep: string;
  readonly startedAt: string;
  readonly duration: string;
}

export interface BaseAgentSummary {
  readonly id: string;
  readonly name: string;
  readonly provider: "Codex" | "Claude Code" | "Cursor" | "OpenCode";
  readonly status: "Running" | "Waiting" | "Idle";
  readonly issueId: string | null;
  readonly operation: string;
  readonly duration: string;
}

export interface BaseAttentionItem {
  readonly id: string;
  readonly issueId: string;
  readonly kind: "approval" | "failure" | "question" | "review";
  readonly title: string;
  readonly detail: string;
  readonly agentName: string;
  readonly urgency: "Urgent" | "High" | "Normal";
  readonly waitingFor: string;
  readonly actionLabel: string;
}

export interface BaseWorkspaceSnapshot {
  readonly workspace: BaseWorkspace;
  readonly projects: readonly BaseProject[];
  readonly repositories: readonly BaseRepository[];
  readonly issues: readonly BaseIssueSummary[];
  readonly workflows: readonly BaseWorkflowSummary[];
  readonly runs: readonly BaseRunSummary[];
  readonly agents: readonly BaseAgentSummary[];
  readonly attentionItems: readonly BaseAttentionItem[];
}

export interface BaseWorkspaceRepository {
  read(): BaseWorkspaceSnapshot;
  getProject(projectId: string): BaseProject | null;
}

const ACTIVE_RUN_STATUSES: ReadonlySet<BaseRunSummary["status"]> = new Set([
  "Queued",
  "Running",
  "Waiting",
]);

export function selectProjectIssues(
  snapshot: BaseWorkspaceSnapshot,
  projectId: string,
): readonly BaseIssueSummary[] {
  return snapshot.issues.filter((issue) => issue.projectId === projectId);
}

export function selectProjectRuns(
  snapshot: BaseWorkspaceSnapshot,
  projectId: string,
): readonly BaseRunSummary[] {
  return snapshot.runs.filter((run) => run.projectId === projectId);
}

export function selectActiveRunCount(snapshot: BaseWorkspaceSnapshot, projectId: string): number {
  return selectProjectRuns(snapshot, projectId).filter(({ status }) =>
    ACTIVE_RUN_STATUSES.has(status),
  ).length;
}

export function selectAttentionCount(snapshot: BaseWorkspaceSnapshot, projectId: string): number {
  const projectIssueIds = new Set(selectProjectIssues(snapshot, projectId).map(({ id }) => id));
  return snapshot.attentionItems.filter(({ issueId }) => projectIssueIds.has(issueId)).length;
}

const snapshot: BaseWorkspaceSnapshot = {
  workspace: {
    id: "workspace-kiso-labs",
    name: "Kiso Labs",
  },
  projects: [
    {
      id: "project-base-desktop",
      workspaceId: "workspace-kiso-labs",
      repositoryId: "repository-base",
      name: "Base Desktop",
      identifier: "BAS",
    },
    {
      id: "project-base-relay",
      workspaceId: "workspace-kiso-labs",
      repositoryId: "repository-base",
      name: "Base Relay",
      identifier: "RLY",
    },
  ],
  repositories: [
    {
      id: "repository-base",
      fullName: "kiso-labs/base",
      defaultBranch: "main",
      remoteUrl: "github.com/kiso-labs/base",
    },
  ],
  issues: [
    {
      id: "issue-bas-101",
      projectId: "project-base-desktop",
      identifier: "BAS-101",
      title: "Add isolated worktree creation for queued agents",
      description: "Create a dedicated worktree before an implementation agent begins editing.",
      status: "Ready",
      priority: "High",
      labels: ["agents", "git"],
      module: "Agent runtime",
      cycle: "Cycle 03",
      assignee: "Planning Agent",
      repositoryId: "repository-base",
      branch: "main",
      dependencies: [],
      workflowId: "workflow-reliable-feature-delivery",
      runState: "idle",
      queuePosition: null,
      latestRunId: null,
      blockedFromStatus: null,
      activity: [{ id: "activity-bas-101", label: "Moved to Ready", createdAt: "12 min ago" }],
      updatedAt: "12 min ago",
    },
    {
      id: "issue-bas-102",
      projectId: "project-base-desktop",
      identifier: "BAS-102",
      title: "Prevent concurrent agents from editing the same branch",
      description: "Reserve branch ownership so overlapping agent sessions cannot corrupt work.",
      status: "Running",
      priority: "Urgent",
      labels: ["reliability", "git"],
      module: "Runtime safety",
      cycle: "Cycle 03",
      assignee: "Codex",
      repositoryId: "repository-base",
      branch: "codex/bas-102-branch-ownership",
      dependencies: ["issue-bas-101"],
      workflowId: "workflow-concurrency-safety",
      runState: "running",
      queuePosition: null,
      latestRunId: "RUN-2048",
      blockedFromStatus: null,
      activity: [
        { id: "activity-bas-102", label: "Implementation agent started", createdAt: "2 min ago" },
      ],
      updatedAt: "2 min ago",
    },
    {
      id: "issue-bas-103",
      projectId: "project-base-desktop",
      identifier: "BAS-103",
      title: "Add retry policy editor to workflow nodes",
      description: "Let workflow authors configure retry count, delay, and backoff per node.",
      status: "Backlog",
      priority: "Medium",
      labels: ["canvas", "workflows"],
      module: "Workflow builder",
      cycle: "Icebox",
      assignee: "Unassigned",
      repositoryId: "repository-base",
      branch: "main",
      dependencies: [],
      workflowId: null,
      runState: "idle",
      queuePosition: null,
      latestRunId: null,
      blockedFromStatus: null,
      activity: [{ id: "activity-bas-103", label: "Issue created", createdAt: "1 hr ago" }],
      updatedAt: "1 hr ago",
    },
    {
      id: "issue-bas-104",
      projectId: "project-base-desktop",
      identifier: "BAS-104",
      title: "Improve failed-run timeline",
      description: "Show retry attempts and failure context in the run timeline.",
      status: "Review",
      priority: "Medium",
      labels: ["runs", "ux"],
      module: "Run observability",
      cycle: "Cycle 02",
      assignee: "Luke",
      repositoryId: "repository-base",
      branch: "codex/bas-104-run-timeline",
      dependencies: [],
      workflowId: "workflow-bug-fix",
      runState: "review",
      queuePosition: null,
      latestRunId: "RUN-2046",
      blockedFromStatus: null,
      activity: [{ id: "activity-bas-104", label: "Sent for review", createdAt: "18 min ago" }],
      updatedAt: "18 min ago",
    },
    {
      id: "issue-bas-105",
      projectId: "project-base-desktop",
      identifier: "BAS-105",
      title: "Validate hooks before a push is attempted",
      description: "Run repository and policy hooks before the push operation reaches Git.",
      status: "Queued",
      priority: "High",
      labels: ["hooks", "safety"],
      module: "Repository safety",
      cycle: "Cycle 03",
      assignee: "Review Agent",
      repositoryId: "repository-base",
      branch: "codex/bas-105-hook-validation",
      dependencies: [],
      workflowId: "workflow-pre-push-review",
      runState: "queued",
      queuePosition: 2,
      latestRunId: "RUN-2047",
      blockedFromStatus: null,
      activity: [{ id: "activity-bas-105", label: "Queued for execution", createdAt: "7 min ago" }],
      updatedAt: "7 min ago",
    },
    {
      id: "issue-rly-1",
      projectId: "project-base-relay",
      repositoryId: "repository-base",
      identifier: "RLY-1",
      title: "Add relay health checks to project startup",
      description: "Verify the relay connection before project automation begins.",
      status: "Ready",
      priority: "High",
      labels: ["relay", "reliability"],
      module: "Connectivity",
      cycle: "Cycle 01",
      assignee: "Codex",
      branch: "main",
      dependencies: [],
      workflowId: "workflow-bug-fix",
      runState: "idle",
      queuePosition: null,
      latestRunId: null,
      blockedFromStatus: null,
      activity: [{ id: "activity-rly-1", label: "Moved to Ready", createdAt: "22 min ago" }],
      updatedAt: "22 min ago",
    },
    {
      id: "issue-rly-2",
      projectId: "project-base-relay",
      repositoryId: "repository-base",
      identifier: "RLY-2",
      title: "Retry relay discovery after a transient failure",
      description: "Keep project startup recoverable when the first relay probe times out.",
      status: "Queued",
      priority: "Medium",
      labels: ["relay", "retries"],
      module: "Connectivity",
      cycle: "Cycle 01",
      assignee: "Planning Agent",
      branch: "codex/rly-2-relay-retry",
      dependencies: ["issue-rly-1"],
      workflowId: "workflow-bug-fix",
      runState: "queued",
      queuePosition: 1,
      latestRunId: "RUN-1042",
      blockedFromStatus: null,
      activity: [{ id: "activity-rly-2", label: "Queued for execution", createdAt: "5 min ago" }],
      updatedAt: "5 min ago",
    },
  ],
  workflows: [
    {
      id: "workflow-reliable-feature-delivery",
      name: "Reliable Feature Delivery",
      description: "Plan, approve, implement, validate, review, and open a pull request.",
      trigger: "Issue enters Ready",
      status: "Published",
      version: 7,
      successRate: 92,
    },
    {
      id: "workflow-bug-fix",
      name: "Bug Fix with Regression Check",
      description: "Reproduce a defect, add a regression test, implement, and review.",
      trigger: "Manual run",
      status: "Published",
      version: 4,
      successRate: 88,
    },
    {
      id: "workflow-pre-push-review",
      name: "Pre-Push AI Review",
      description: "Inspect a diff and run policy hooks before a push is allowed.",
      trigger: "Push attempted",
      status: "Published",
      version: 3,
      successRate: 97,
    },
    {
      id: "workflow-concurrency-safety",
      name: "Concurrency Safety Check",
      description: "Reserve a worktree and verify branch ownership before implementation.",
      trigger: "Issue queued",
      status: "Draft",
      version: 2,
      successRate: null,
    },
  ],
  runs: [
    {
      id: "RUN-2048",
      projectId: "project-base-desktop",
      workflowId: "workflow-concurrency-safety",
      workflowVersionId: "workflow-concurrency-safety:v2",
      workflowVersion: 2,
      issueId: "issue-bas-102",
      status: "Running",
      currentStep: "Implementation agent",
      startedAt: "14 min ago",
      duration: "14m 08s",
    },
    {
      id: "RUN-2047",
      projectId: "project-base-desktop",
      workflowId: "workflow-pre-push-review",
      workflowVersionId: "workflow-pre-push-review:v3",
      workflowVersion: 3,
      issueId: "issue-bas-105",
      status: "Queued",
      currentStep: "Waiting for capacity",
      startedAt: "7 min ago",
      duration: "—",
    },
    {
      id: "RUN-2046",
      projectId: "project-base-desktop",
      workflowId: "workflow-bug-fix",
      workflowVersionId: "workflow-bug-fix:v4",
      workflowVersion: 4,
      issueId: "issue-bas-104",
      status: "Waiting",
      currentStep: "Human approval",
      startedAt: "38 min ago",
      duration: "37m 42s",
    },
    {
      id: "RUN-1042",
      projectId: "project-base-relay",
      workflowId: "workflow-bug-fix",
      workflowVersionId: "workflow-bug-fix:v4",
      workflowVersion: 4,
      issueId: "issue-rly-2",
      status: "Queued",
      currentStep: "Waiting for capacity",
      startedAt: "5 min ago",
      duration: "—",
    },
  ],
  agents: [
    {
      id: "agent-session-codex-14",
      name: "Implementation Agent",
      provider: "Codex",
      status: "Running",
      issueId: "issue-bas-102",
      operation: "Updating worktree ownership checks",
      duration: "11m 24s",
    },
    {
      id: "agent-session-claude-7",
      name: "Review Agent",
      provider: "Claude Code",
      status: "Waiting",
      issueId: "issue-bas-104",
      operation: "Waiting for approval",
      duration: "23m 09s",
    },
    {
      id: "agent-profile-triage",
      name: "Triage Agent",
      provider: "OpenCode",
      status: "Idle",
      issueId: null,
      operation: "Available",
      duration: "—",
    },
  ],
  attentionItems: [
    {
      id: "attention-plan-approval",
      issueId: "issue-bas-101",
      kind: "approval",
      title: "Approve the worktree isolation plan",
      detail: "Planning is complete. The run is paused before implementation begins.",
      agentName: "Planning Agent",
      urgency: "High",
      waitingFor: "12 min",
      actionLabel: "Review plan",
    },
    {
      id: "attention-hook-failure",
      issueId: "issue-bas-105",
      kind: "failure",
      title: "Pre-push policy hook failed",
      detail: "The branch protection check found an unowned worktree.",
      agentName: "Review Agent",
      urgency: "Urgent",
      waitingFor: "7 min",
      actionLabel: "Inspect failure",
    },
    {
      id: "attention-agent-question",
      issueId: "issue-bas-103",
      kind: "question",
      title: "Choose the default retry backoff",
      detail: "The agent needs a product decision before it can finish the node contract.",
      agentName: "Planning Agent",
      urgency: "Normal",
      waitingFor: "1 hr",
      actionLabel: "Answer agent",
    },
    {
      id: "attention-review-ready",
      issueId: "issue-bas-104",
      kind: "review",
      title: "Failed-run timeline is ready for review",
      detail: "Tests are green and the simulated pull request contains four changed files.",
      agentName: "Implementation Agent",
      urgency: "Normal",
      waitingFor: "18 min",
      actionLabel: "Review changes",
    },
  ],
};

export const baseWorkspaceRepository: BaseWorkspaceRepository = {
  read: () => snapshot,
  getProject: (projectId) => snapshot.projects.find(({ id }) => id === projectId) ?? null,
};

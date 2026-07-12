export type BaseIssueStatus =
  | "Backlog"
  | "Planned"
  | "Ready"
  | "Queued"
  | "Running"
  | "Blocked"
  | "Review"
  | "Done";

export type BasePriority = "Urgent" | "High" | "Medium" | "Low" | "None";

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
  readonly status: BaseIssueStatus;
  readonly priority: BasePriority;
  readonly labels: readonly string[];
  readonly assignee: string;
  readonly workflowId: string | null;
  readonly runState: "idle" | "queued" | "running" | "review";
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
  readonly activeRuns: number;
}

export interface BaseRunSummary {
  readonly id: string;
  readonly workflowId: string;
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

export function selectActiveRunCount(snapshot: BaseWorkspaceSnapshot): number {
  return snapshot.runs.filter(({ status }) => ACTIVE_RUN_STATUSES.has(status)).length;
}

export function selectAttentionCount(snapshot: BaseWorkspaceSnapshot): number {
  return snapshot.attentionItems.length;
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
      status: "Ready",
      priority: "High",
      labels: ["agents", "git"],
      assignee: "Planning Agent",
      workflowId: "workflow-reliable-feature-delivery",
      runState: "idle",
      updatedAt: "12 min ago",
    },
    {
      id: "issue-bas-102",
      projectId: "project-base-desktop",
      identifier: "BAS-102",
      title: "Prevent concurrent agents from editing the same branch",
      status: "Running",
      priority: "Urgent",
      labels: ["reliability", "git"],
      assignee: "Codex",
      workflowId: "workflow-concurrency-safety",
      runState: "running",
      updatedAt: "2 min ago",
    },
    {
      id: "issue-bas-103",
      projectId: "project-base-desktop",
      identifier: "BAS-103",
      title: "Add retry policy editor to workflow nodes",
      status: "Backlog",
      priority: "Medium",
      labels: ["canvas", "workflows"],
      assignee: "Unassigned",
      workflowId: null,
      runState: "idle",
      updatedAt: "1 hr ago",
    },
    {
      id: "issue-bas-104",
      projectId: "project-base-desktop",
      identifier: "BAS-104",
      title: "Improve failed-run timeline",
      status: "Review",
      priority: "Medium",
      labels: ["runs", "ux"],
      assignee: "Luke",
      workflowId: "workflow-bug-fix",
      runState: "review",
      updatedAt: "18 min ago",
    },
    {
      id: "issue-bas-105",
      projectId: "project-base-desktop",
      identifier: "BAS-105",
      title: "Validate hooks before a push is attempted",
      status: "Queued",
      priority: "High",
      labels: ["hooks", "safety"],
      assignee: "Review Agent",
      workflowId: "workflow-pre-push-review",
      runState: "queued",
      updatedAt: "7 min ago",
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
      activeRuns: 1,
    },
    {
      id: "workflow-bug-fix",
      name: "Bug Fix with Regression Check",
      description: "Reproduce a defect, add a regression test, implement, and review.",
      trigger: "Manual run",
      status: "Published",
      version: 4,
      successRate: 88,
      activeRuns: 1,
    },
    {
      id: "workflow-pre-push-review",
      name: "Pre-Push AI Review",
      description: "Inspect a diff and run policy hooks before a push is allowed.",
      trigger: "Push attempted",
      status: "Published",
      version: 3,
      successRate: 97,
      activeRuns: 1,
    },
    {
      id: "workflow-concurrency-safety",
      name: "Concurrency Safety Check",
      description: "Reserve a worktree and verify branch ownership before implementation.",
      trigger: "Issue queued",
      status: "Draft",
      version: 2,
      successRate: null,
      activeRuns: 1,
    },
  ],
  runs: [
    {
      id: "RUN-2048",
      workflowId: "workflow-concurrency-safety",
      issueId: "issue-bas-102",
      status: "Running",
      currentStep: "Implementation agent",
      startedAt: "14 min ago",
      duration: "14m 08s",
    },
    {
      id: "RUN-2047",
      workflowId: "workflow-pre-push-review",
      issueId: "issue-bas-105",
      status: "Queued",
      currentStep: "Waiting for capacity",
      startedAt: "7 min ago",
      duration: "—",
    },
    {
      id: "RUN-2046",
      workflowId: "workflow-bug-fix",
      issueId: "issue-bas-104",
      status: "Waiting",
      currentStep: "Human approval",
      startedAt: "38 min ago",
      duration: "37m 42s",
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

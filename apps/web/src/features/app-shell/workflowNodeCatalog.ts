import type { WorkflowEdge, WorkflowNode, WorkflowPosition } from "./workflowGraph";

export const WORKFLOW_NODE_KINDS = [
  "trigger",
  "agent",
  "test",
  "hook",
  "approval",
  "branch",
] as const satisfies readonly WorkflowNode["kind"][];

export interface WorkflowNodeDefinition {
  readonly kind: WorkflowNode["kind"];
  readonly label: string;
  readonly description: string;
  readonly group: "Start" | "Actions" | "Control";
}

export const WORKFLOW_NODE_DEFINITIONS: readonly WorkflowNodeDefinition[] = [
  {
    kind: "trigger",
    label: "Trigger",
    description: "Start from an issue, repository, schedule, webhook, or manual run.",
    group: "Start",
  },
  {
    kind: "agent",
    label: "Agent step",
    description: "Give a coding agent a prompt, tools, timeout, and retry policy.",
    group: "Actions",
  },
  {
    kind: "test",
    label: "Test",
    description: "Run a deterministic command and branch on its result.",
    group: "Actions",
  },
  {
    kind: "hook",
    label: "Hook",
    description: "Run a lifecycle or custom policy command.",
    group: "Actions",
  },
  {
    kind: "approval",
    label: "Approval",
    description: "Pause for a human decision with explicit timeout behavior.",
    group: "Control",
  },
  {
    kind: "branch",
    label: "Branch",
    description: "Route execution through named conditional cases and a default path.",
    group: "Control",
  },
] as const;

const DEFAULT_RETRY = {
  maxRetries: 2,
  strategy: "exponential" as const,
  delaySeconds: 10,
  maxDelaySeconds: 120,
};

export function createWorkflowNode(
  kind: WorkflowNode["kind"],
  id: string,
  position: WorkflowPosition,
): WorkflowNode {
  const base = { id, position, disabled: false } as const;
  switch (kind) {
    case "trigger":
      return { ...base, kind: "trigger", name: "Manual trigger", config: { event: "manual" } };
    case "agent":
      return {
        ...base,
        kind: "agent",
        name: "Agent step",
        config: {
          agentProfileId: "agent-profile-codex",
          prompt: "Describe the outcome this agent should produce.",
          workingDirectory: ".",
          tools: ["repository"],
          timeoutSeconds: 900,
          retry: DEFAULT_RETRY,
        },
      };
    case "test":
      return {
        ...base,
        kind: "test",
        name: "Run tests",
        config: {
          command: "vp test",
          workingDirectory: ".",
          timeoutSeconds: 900,
          retry: DEFAULT_RETRY,
        },
      };
    case "hook":
      return {
        ...base,
        kind: "hook",
        name: "Pre-push hook",
        config: {
          hook: "pre-push",
          command: "vp check && vp run typecheck",
          timeoutSeconds: 600,
          retry: { ...DEFAULT_RETRY, maxRetries: 1 },
        },
      };
    case "approval":
      return {
        ...base,
        kind: "approval",
        name: "Human approval",
        config: {
          instructions: "Review the agent output before execution continues.",
          approverGroup: "Project maintainers",
          timeoutMinutes: 1440,
          timeoutOutcome: "reject",
        },
      };
    case "branch":
      return {
        ...base,
        kind: "branch",
        name: "Decision",
        config: {
          cases: [{ id: `${id}-case-yes`, label: "Matches", expression: "result.ok === true" }],
        },
      };
  }
}

export function workflowNodeSummary(node: WorkflowNode): string {
  switch (node.kind) {
    case "trigger":
      return node.config.event === "issue-status"
        ? `Issue enters ${node.config.status}`
        : node.config.event.replaceAll("-", " ");
    case "agent":
      return node.config.prompt || "Configure the agent prompt";
    case "test":
      return node.config.command || "Configure a test command";
    case "hook":
      return `${node.config.hook.replaceAll("-", " ")} · ${node.config.command}`;
    case "approval":
      return node.config.approverGroup || "Choose approvers";
    case "branch":
      return `${node.config.cases.length} condition${node.config.cases.length === 1 ? "" : "s"} + default`;
  }
}

export interface WorkflowOutputDefinition {
  readonly id: string;
  readonly label: string;
  readonly edge: WorkflowEdgeOutput;
}

type WorkflowEdgeOutput<Edge = WorkflowEdge> = Edge extends WorkflowEdge
  ? Omit<Edge, "id" | "sourceNodeId" | "targetNodeId">
  : never;

export function workflowNodeOutputs(node: WorkflowNode): readonly WorkflowOutputDefinition[] {
  if (node.kind === "trigger") {
    return [{ id: "success", label: "Continue", edge: { kind: "success" } }];
  }
  if (node.kind === "agent" || node.kind === "test" || node.kind === "hook") {
    return [
      { id: "success", label: "Success", edge: { kind: "success" } },
      { id: "failure", label: "Failure", edge: { kind: "failure" } },
    ];
  }
  if (node.kind === "approval") {
    return [
      {
        id: "approved",
        label: "Approved",
        edge: { kind: "approval", outcome: "approved" },
      },
      {
        id: "rejected",
        label: "Rejected",
        edge: { kind: "approval", outcome: "rejected" },
      },
      {
        id: "timed-out",
        label: "Timed out",
        edge: { kind: "approval", outcome: "timed-out" },
      },
    ];
  }
  return [
    ...node.config.cases.map((workflowCase) => ({
      id: workflowCase.id,
      label: workflowCase.label,
      edge: { kind: "branch" as const, caseId: workflowCase.id },
    })),
    { id: "default", label: "Otherwise", edge: { kind: "branch", caseId: null } },
  ];
}

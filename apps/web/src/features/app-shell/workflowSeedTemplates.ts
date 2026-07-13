import {
  createWorkflowDraft,
  workflowContentChecksum,
  type WorkflowDraftContent,
  type WorkflowGraph,
  type WorkflowRetryPolicy,
  type WorkflowTemplate,
  type WorkflowTriggerConfig,
} from "./workflowGraph";
import { WORKFLOW_AGENT_PROFILE_IDS } from "./workflowAgentProfiles";
import { baseWorkspaceRepository, type BaseWorkflowSummary } from "./workspaceRepository";

interface WorkflowSeedBlueprint {
  readonly trigger: WorkflowTriggerConfig;
  readonly agentName: string;
  readonly agentPrompt: string;
  readonly testName: string;
  readonly testCommand: string;
  readonly hookName: string;
  readonly hook: "pre-commit" | "pre-push" | "post-run" | "custom";
  readonly hookCommand: string;
  readonly approvalName: string;
  readonly approvalInstructions: string;
  readonly branchName: string;
  readonly branchLabel: string;
  readonly branchExpression: string;
  readonly finalizeName: string;
  readonly finalizePrompt: string;
}

const RETRY_POLICY: WorkflowRetryPolicy = {
  maxRetries: 2,
  strategy: "exponential",
  delaySeconds: 15,
  maxDelaySeconds: 120,
};

const SEED_BLUEPRINTS: Readonly<Record<string, WorkflowSeedBlueprint>> = {
  "workflow-reliable-feature-delivery": {
    trigger: { event: "issue-status", status: "Ready" },
    agentName: "Plan implementation",
    agentPrompt: "Read the issue and repository context, then produce an implementation plan.",
    testName: "Validate the change",
    testCommand: "vp test",
    hookName: "Pre-push policy",
    hook: "pre-push",
    hookCommand: "vp check && vp run typecheck",
    approvalName: "Approve delivery",
    approvalInstructions: "Review the plan, test evidence, and proposed repository changes.",
    branchName: "Delivery decision",
    branchLabel: "Ready to deliver",
    branchExpression: "review.approved && tests.passed",
    finalizeName: "Prepare pull request",
    finalizePrompt: "Summarize the change, preserve the evidence, and prepare the pull request.",
  },
  "workflow-bug-fix": {
    trigger: { event: "manual" },
    agentName: "Reproduce defect",
    agentPrompt: "Reproduce the reported behavior and identify the smallest reliable fix.",
    testName: "Run regression checks",
    testCommand: "vp test",
    hookName: "Review changed files",
    hook: "pre-commit",
    hookCommand: "vp check",
    approvalName: "Approve bug fix",
    approvalInstructions: "Confirm the regression is covered and the fix stays within scope.",
    branchName: "Regression resolved?",
    branchLabel: "Regression fixed",
    branchExpression: "tests.regressionPassed",
    finalizeName: "Package the fix",
    finalizePrompt: "Prepare a concise fix summary with the regression evidence.",
  },
  "workflow-pre-push-review": {
    trigger: { event: "repository", action: "push" },
    agentName: "Review pending diff",
    agentPrompt: "Inspect the pending diff for correctness, security, and repository policy risks.",
    testName: "Run policy suite",
    testCommand: "vp check && vp run typecheck",
    hookName: "Enforce pre-push policy",
    hook: "pre-push",
    hookCommand: "vp test",
    approvalName: "Approve push",
    approvalInstructions: "Review blocking findings before allowing the push to continue.",
    branchName: "Policy decision",
    branchLabel: "Push is safe",
    branchExpression: "review.blockers === 0",
    finalizeName: "Release push",
    finalizePrompt: "Record the review evidence and release the guarded push.",
  },
  "workflow-concurrency-safety": {
    trigger: { event: "issue-queued" },
    agentName: "Reserve worktree",
    agentPrompt: "Reserve an isolated branch and worktree for the queued issue.",
    testName: "Verify branch ownership",
    testCommand: "git status --short --branch",
    hookName: "Check workspace policy",
    hook: "custom",
    hookCommand: "vp check",
    approvalName: "Approve workspace",
    approvalInstructions: "Confirm the issue owns an isolated branch and writable worktree.",
    branchName: "Workspace safe?",
    branchLabel: "Isolation confirmed",
    branchExpression: "workspace.isolated && branch.owned",
    finalizeName: "Start implementation",
    finalizePrompt: "Hand the isolated workspace and issue context to the implementation agent.",
  },
};

const workspaceSnapshot = baseWorkspaceRepository.read();

export const WORKFLOW_SEED_SUCCESS_RATES: Readonly<Record<string, number | null>> =
  Object.fromEntries(workspaceSnapshot.workflows.map(({ id, successRate }) => [id, successRate]));

export const BASE_WORKFLOW_SEED_TEMPLATES: readonly WorkflowTemplate[] =
  workspaceSnapshot.workflows.map(createSeedTemplate);

function createSeedTemplate(summary: BaseWorkflowSummary): WorkflowTemplate {
  const blueprint = SEED_BLUEPRINTS[summary.id];
  if (!blueprint) {
    throw new Error(`Missing workflow seed blueprint for ${summary.id}.`);
  }

  const content: WorkflowDraftContent = {
    name: summary.name,
    description: summary.description,
    graph: createSeedGraph(summary.id, blueprint),
  };
  const publishedContent: WorkflowDraftContent =
    summary.status === "Draft"
      ? {
          ...structuredClone(content),
          description: "Reserve an isolated worktree before an implementation agent begins.",
        }
      : structuredClone(content);
  const version = {
    id: `${summary.id}:v${summary.version}`,
    templateId: summary.id,
    version: summary.version,
    content: publishedContent,
    publishedAt: "2026-07-01T16:00:00.000Z",
    checksum: workflowContentChecksum(publishedContent),
  };
  const draft = createWorkflowDraft(summary.id, content);

  return {
    id: summary.id,
    workspaceId: workspaceSnapshot.workspace.id,
    draft: summary.status === "Draft" ? { ...draft, revision: 1 } : draft,
    versions: [version],
    archivedAt: null,
  };
}

function createSeedGraph(templateId: string, blueprint: WorkflowSeedBlueprint): WorkflowGraph {
  const nodeId = (suffix: string) => `${templateId}:${suffix}`;
  const nodes: WorkflowGraph["nodes"] = [
    {
      id: nodeId("trigger"),
      kind: "trigger",
      name: "Start workflow",
      position: { x: 40, y: 180 },
      disabled: false,
      config: blueprint.trigger,
    },
    {
      id: nodeId("agent"),
      kind: "agent",
      name: blueprint.agentName,
      position: { x: 340, y: 180 },
      disabled: false,
      config: {
        agentProfileId: WORKFLOW_AGENT_PROFILE_IDS.planning,
        prompt: blueprint.agentPrompt,
        workingDirectory: ".",
        tools: ["repository", "terminal", "issues"],
        timeoutSeconds: 1_800,
        retry: RETRY_POLICY,
      },
    },
    {
      id: nodeId("test"),
      kind: "test",
      name: blueprint.testName,
      position: { x: 640, y: 180 },
      disabled: false,
      config: {
        command: blueprint.testCommand,
        workingDirectory: ".",
        timeoutSeconds: 1_200,
        retry: { ...RETRY_POLICY, maxRetries: 1 },
      },
    },
    {
      id: nodeId("hook"),
      kind: "hook",
      name: blueprint.hookName,
      position: { x: 940, y: 180 },
      disabled: false,
      config: {
        hook: blueprint.hook,
        command: blueprint.hookCommand,
        timeoutSeconds: 900,
        retry: { ...RETRY_POLICY, strategy: "fixed", maxRetries: 1 },
      },
    },
    {
      id: nodeId("approval"),
      kind: "approval",
      name: blueprint.approvalName,
      position: { x: 1_240, y: 180 },
      disabled: false,
      config: {
        instructions: blueprint.approvalInstructions,
        approverGroup: "maintainers",
        timeoutMinutes: 1_440,
        timeoutOutcome: "reject",
      },
    },
    {
      id: nodeId("branch"),
      kind: "branch",
      name: blueprint.branchName,
      position: { x: 1_540, y: 180 },
      disabled: false,
      config: {
        cases: [
          {
            id: "continue",
            label: blueprint.branchLabel,
            expression: blueprint.branchExpression,
          },
        ],
      },
    },
    {
      id: nodeId("finalize"),
      kind: "agent",
      name: blueprint.finalizeName,
      position: { x: 1_840, y: 40 },
      disabled: false,
      config: {
        agentProfileId: WORKFLOW_AGENT_PROFILE_IDS.implementation,
        prompt: blueprint.finalizePrompt,
        workingDirectory: ".",
        tools: ["repository", "terminal"],
        timeoutSeconds: 1_800,
        retry: RETRY_POLICY,
      },
    },
    {
      id: nodeId("stop"),
      kind: "hook",
      name: "Record workflow outcome",
      position: { x: 2_140, y: 260 },
      disabled: false,
      config: {
        hook: "post-run",
        command: "record-workflow-outcome",
        timeoutSeconds: 300,
        retry: { ...RETRY_POLICY, strategy: "fixed", maxRetries: 1 },
      },
    },
  ];
  const edge = (suffix: string, source: string, target: string, kind: "failure" | "success") => ({
    id: `${templateId}:${suffix}`,
    kind,
    sourceNodeId: nodeId(source),
    targetNodeId: nodeId(target),
  });

  return {
    nodes,
    edges: [
      edge("trigger-agent", "trigger", "agent", "success"),
      edge("agent-test", "agent", "test", "success"),
      edge("agent-stop", "agent", "stop", "failure"),
      edge("test-hook", "test", "hook", "success"),
      edge("test-stop", "test", "stop", "failure"),
      edge("hook-approval", "hook", "approval", "success"),
      edge("hook-stop", "hook", "stop", "failure"),
      {
        id: `${templateId}:approval-branch`,
        kind: "approval",
        outcome: "approved",
        sourceNodeId: nodeId("approval"),
        targetNodeId: nodeId("branch"),
      },
      {
        id: `${templateId}:approval-stop`,
        kind: "approval",
        outcome: "rejected",
        sourceNodeId: nodeId("approval"),
        targetNodeId: nodeId("stop"),
      },
      {
        id: `${templateId}:branch-finalize`,
        kind: "branch",
        caseId: "continue",
        sourceNodeId: nodeId("branch"),
        targetNodeId: nodeId("finalize"),
      },
      {
        id: `${templateId}:branch-stop`,
        kind: "branch",
        caseId: null,
        sourceNodeId: nodeId("branch"),
        targetNodeId: nodeId("stop"),
      },
      edge("finalize-stop-success", "finalize", "stop", "success"),
      edge("finalize-stop-failure", "finalize", "stop", "failure"),
    ],
  };
}

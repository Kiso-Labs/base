import { describe, expect, it } from "vite-plus/test";

import {
  applyWorkflowCommand,
  applyWorkflowHistoryCommand,
  createWorkflowHistory,
  createWorkflowDraft,
  redoWorkflowHistory,
  publishWorkflow,
  undoWorkflowHistory,
  validateWorkflowDraft,
  type WorkflowNode,
} from "./workflowGraph";

const triggerNode: WorkflowNode = {
  id: "trigger-ready",
  kind: "trigger",
  name: "Issue enters Ready",
  position: { x: 120, y: 180 },
  disabled: false,
  config: { event: "issue-status", status: "Ready" },
};

const retry = {
  maxRetries: 2,
  strategy: "exponential" as const,
  delaySeconds: 10,
  maxDelaySeconds: 120,
};

const agentNode: WorkflowNode = {
  id: "agent-plan",
  kind: "agent",
  name: "Plan issue",
  position: { x: 420, y: 180 },
  disabled: false,
  config: {
    agentProfileId: "agent-profile-planning",
    prompt: "Create an implementation plan for the current issue.",
    workingDirectory: ".",
    tools: ["repository"],
    timeoutSeconds: 900,
    retry,
  },
};

function createPublishableDraft() {
  const checks: WorkflowNode = {
    id: "test-checks",
    kind: "test",
    name: "Run checks",
    position: { x: 700, y: 180 },
    disabled: false,
    config: {
      command: "vp check",
      workingDirectory: ".",
      timeoutSeconds: 900,
      retry,
    },
  };
  const hook: WorkflowNode = {
    id: "hook-pre-push",
    kind: "hook",
    name: "Pre-push policy",
    position: { x: 980, y: 180 },
    disabled: false,
    config: { hook: "pre-push", command: "vp check", timeoutSeconds: 600, retry },
  };
  const approval: WorkflowNode = {
    id: "approval-review",
    kind: "approval",
    name: "Human review",
    position: { x: 1260, y: 180 },
    disabled: false,
    config: {
      instructions: "Review the implementation plan and test results.",
      approverGroup: "maintainers",
      timeoutMinutes: 1_440,
      timeoutOutcome: "reject",
    },
  };
  const branch: WorkflowNode = {
    id: "branch-changes",
    kind: "branch",
    name: "Changes requested?",
    position: { x: 1540, y: 180 },
    disabled: false,
    config: {
      cases: [{ id: "changes", label: "Changes requested", expression: "review.changes" }],
    },
  };
  const revise: WorkflowNode = {
    ...agentNode,
    id: "agent-revise",
    name: "Revise implementation",
    position: { x: 1820, y: 80 },
  };
  const notify: WorkflowNode = {
    ...hook,
    id: "hook-notify",
    name: "Notify completion",
    position: { x: 1820, y: 300 },
    config: { ...hook.config, hook: "post-run", command: "notify complete" },
  };
  return createWorkflowDraft("workflow-feature", {
    name: "Feature delivery",
    description: "Plan, validate, and review a project issue.",
    graph: {
      nodes: [triggerNode, agentNode, checks, hook, approval, branch, revise, notify],
      edges: [
        { id: "e1", kind: "success", sourceNodeId: triggerNode.id, targetNodeId: agentNode.id },
        { id: "e2", kind: "success", sourceNodeId: agentNode.id, targetNodeId: checks.id },
        { id: "e3", kind: "success", sourceNodeId: checks.id, targetNodeId: hook.id },
        { id: "e4", kind: "success", sourceNodeId: hook.id, targetNodeId: approval.id },
        {
          id: "e5",
          kind: "approval",
          outcome: "approved",
          sourceNodeId: approval.id,
          targetNodeId: branch.id,
        },
        {
          id: "e6",
          kind: "branch",
          caseId: "changes",
          sourceNodeId: branch.id,
          targetNodeId: revise.id,
        },
        {
          id: "e7",
          kind: "branch",
          caseId: null,
          sourceNodeId: branch.id,
          targetNodeId: notify.id,
        },
        { id: "e8", kind: "success", sourceNodeId: revise.id, targetNodeId: notify.id },
      ],
    },
  });
}

describe("workflow graph", () => {
  it("applies node commands without mutating the prior draft", () => {
    const initial = createWorkflowDraft("workflow-feature", {
      name: "Feature delivery",
      description: "Plan and implement a project issue.",
      graph: { nodes: [], edges: [] },
    });

    const result = applyWorkflowCommand(initial, { type: "node.add", node: triggerNode });

    expect(result).toMatchObject({ accepted: true, changed: true });
    expect(result.draft).toMatchObject({ revision: 1 });
    expect(result.draft.content.graph.nodes).toEqual([triggerNode]);
    expect(initial.content.graph.nodes).toEqual([]);
  });

  it("connects typed outcomes and deletes incident edges atomically", () => {
    const initial = createWorkflowDraft("workflow-feature", {
      name: "Feature delivery",
      description: "Plan and implement a project issue.",
      graph: { nodes: [triggerNode, agentNode], edges: [] },
    });
    const edge = {
      id: "edge-trigger-plan",
      kind: "success" as const,
      sourceNodeId: triggerNode.id,
      targetNodeId: agentNode.id,
    };

    const connected = applyWorkflowCommand(initial, { type: "edge.connect", edge });
    expect(connected).toMatchObject({ accepted: true, changed: true });
    expect(connected.draft.content.graph.edges).toEqual([edge]);

    const removed = applyWorkflowCommand(connected.draft, {
      type: "nodes.remove",
      nodeIds: [triggerNode.id],
    });
    expect(removed).toMatchObject({ accepted: true, changed: true });
    expect(removed.draft.content.graph).toEqual({ nodes: [agentNode], edges: [] });
    expect(connected.draft.content.graph).toEqual({
      nodes: [triggerNode, agentNode],
      edges: [edge],
    });
  });

  it("enforces connection invariants below the canvas adapter", () => {
    const secondAgent: WorkflowNode = {
      ...agentNode,
      id: "agent-implement",
      name: "Implement issue",
      position: { x: 720, y: 180 },
    };
    const initial = createWorkflowDraft("workflow-safe-connections", {
      name: "Safe connections",
      description: "Reject invalid control flow at the domain boundary.",
      graph: {
        nodes: [triggerNode, agentNode, secondAgent],
        edges: [
          {
            id: "edge-trigger-plan",
            kind: "success",
            sourceNodeId: triggerNode.id,
            targetNodeId: agentNode.id,
          },
          {
            id: "edge-plan-implement",
            kind: "success",
            sourceNodeId: agentNode.id,
            targetNodeId: secondAgent.id,
          },
        ],
      },
    });

    expect(
      applyWorkflowCommand(initial, {
        type: "edge.connect",
        edge: {
          id: "edge-trigger-implement",
          kind: "success",
          sourceNodeId: triggerNode.id,
          targetNodeId: secondAgent.id,
        },
      }),
    ).toMatchObject({ accepted: false, reason: "The success output is already connected." });
    expect(
      applyWorkflowCommand(initial, {
        type: "edge.connect",
        edge: {
          id: "edge-implement-trigger",
          kind: "failure",
          sourceNodeId: secondAgent.id,
          targetNodeId: triggerNode.id,
        },
      }),
    ).toMatchObject({ accepted: false, reason: "Trigger nodes cannot have incoming edges." });
    expect(
      applyWorkflowCommand(initial, {
        type: "edge.connect",
        edge: {
          id: "edge-implement-plan",
          kind: "failure",
          sourceNodeId: secondAgent.id,
          targetNodeId: agentNode.id,
        },
      }),
    ).toMatchObject({ accepted: false, reason: "Workflow connections cannot create a cycle." });
  });

  it("updates node configuration, batches movement, and removes edges", () => {
    const edge = {
      id: "edge-trigger-plan",
      kind: "success" as const,
      sourceNodeId: triggerNode.id,
      targetNodeId: agentNode.id,
    };
    const initial = createWorkflowDraft("workflow-feature", {
      name: "Feature delivery",
      description: "Plan and implement a project issue.",
      graph: { nodes: [triggerNode, agentNode], edges: [edge] },
    });
    const configuredAgent: WorkflowNode = {
      ...agentNode,
      name: "Plan implementation",
      config: { ...agentNode.config, prompt: "Write an implementation plan with test cases." },
    };

    const updated = applyWorkflowCommand(initial, {
      type: "node.update",
      node: configuredAgent,
    });
    expect(updated.draft.content.graph.nodes).toEqual([triggerNode, configuredAgent]);

    const moved = applyWorkflowCommand(updated.draft, {
      type: "nodes.move",
      positions: {
        [triggerNode.id]: { x: 100, y: 220 },
        [agentNode.id]: { x: 460, y: 220 },
      },
    });
    expect(moved.draft.content.graph.nodes.map(({ position }) => position)).toEqual([
      { x: 100, y: 220 },
      { x: 460, y: 220 },
    ]);

    const removed = applyWorkflowCommand(moved.draft, {
      type: "edges.remove",
      edgeIds: [edge.id],
    });
    expect(removed.draft.content.graph.edges).toEqual([]);
    expect(removed.draft.revision).toBe(3);
  });

  it("reports trigger, cycle, and reachability errors deterministically", () => {
    const orphanTest: WorkflowNode = {
      id: "test-orphan",
      kind: "test",
      name: "Orphaned checks",
      position: { x: 760, y: 420 },
      disabled: false,
      config: {
        command: "vp test",
        workingDirectory: ".",
        timeoutSeconds: 900,
        retry,
      },
    };
    const draft = createWorkflowDraft("workflow-invalid", {
      name: "Invalid workflow",
      description: "Exercises structural validation.",
      graph: {
        nodes: [triggerNode, agentNode, orphanTest],
        edges: [
          {
            id: "edge-trigger-agent",
            kind: "success",
            sourceNodeId: triggerNode.id,
            targetNodeId: agentNode.id,
          },
          {
            id: "edge-agent-trigger",
            kind: "failure",
            sourceNodeId: agentNode.id,
            targetNodeId: triggerNode.id,
          },
        ],
      },
    });

    const report = validateWorkflowDraft(draft);

    expect(report.canPublish).toBe(false);
    expect(report.diagnostics.map(({ code }) => code)).toEqual([
      "trigger-incoming-edge",
      "graph-cycle",
      "unreachable-node",
    ]);
    expect(report.diagnostics[0]).toMatchObject({
      severity: "error",
      edgeId: "edge-agent-trigger",
      nodeId: triggerNode.id,
    });
  });

  it("validates typed node configuration, retry policy, references, and branch outcomes", () => {
    const valid = createPublishableDraft();

    expect(validateWorkflowDraft(valid, { agentProfileIds: ["agent-profile-planning"] })).toEqual({
      diagnostics: [],
      canPublish: true,
    });

    const invalidAgent: WorkflowNode = {
      ...agentNode,
      config: {
        ...agentNode.config,
        agentProfileId: "agent-profile-missing",
        prompt: " ",
        retry: { ...retry, maxRetries: 11 },
      },
    };
    const invalid = createWorkflowDraft("workflow-invalid-config", {
      ...valid.content,
      graph: {
        nodes: valid.content.graph.nodes.map((node) =>
          node.id === invalidAgent.id ? invalidAgent : node,
        ),
        edges: valid.content.graph.edges.filter(({ id }) => id !== "e7"),
      },
    });

    expect(
      validateWorkflowDraft(invalid, {
        agentProfileIds: ["agent-profile-planning"],
      }).diagnostics.map(({ code }) => code),
    ).toEqual([
      "agent-config-invalid",
      "retry-policy-invalid",
      "unknown-agent-profile",
      "branch-default-edge-missing",
    ]);
  });

  it("rejects reused outputs and duplicate normalized branch labels", () => {
    const valid = createPublishableDraft();
    const branch = valid.content.graph.nodes.find(
      (node): node is Extract<WorkflowNode, { readonly kind: "branch" }> => node.kind === "branch",
    )!;
    const invalidBranch: WorkflowNode = {
      ...branch,
      config: {
        cases: [
          ...branch.config.cases,
          { id: "changes-again", label: " changes REQUESTED ", expression: "review.retry" },
        ],
      },
    };
    const draft = createWorkflowDraft("workflow-duplicate-outputs", {
      ...valid.content,
      graph: {
        nodes: valid.content.graph.nodes.map((node) =>
          node.id === invalidBranch.id ? invalidBranch : node,
        ),
        edges: [
          ...valid.content.graph.edges,
          {
            id: "e9",
            kind: "success",
            sourceNodeId: triggerNode.id,
            targetNodeId: "hook-notify",
          },
          {
            id: "e10",
            kind: "branch",
            caseId: "changes-again",
            sourceNodeId: branch.id,
            targetNodeId: "hook-notify",
          },
        ],
      },
    });

    expect(validateWorkflowDraft(draft).diagnostics.map(({ code }) => code)).toEqual([
      "branch-config-invalid",
      "edge-output-duplicate",
    ]);
  });

  it("keeps bounded semantic history and treats undo and redo as new revisions", () => {
    const initial = createPublishableDraft();
    const history = createWorkflowHistory(initial);
    const moved = applyWorkflowHistoryCommand(history, {
      type: "nodes.move",
      positions: { [triggerNode.id]: { x: 90, y: 90 } },
    });

    expect(moved).toMatchObject({ accepted: true, changed: true });
    expect(moved.history.past).toHaveLength(1);
    expect(moved.history.present.revision).toBe(1);

    const noOp = applyWorkflowHistoryCommand(moved.history, {
      type: "nodes.move",
      positions: { [triggerNode.id]: { x: 90, y: 90 } },
    });
    expect(noOp).toMatchObject({ accepted: true, changed: false });
    expect(noOp.history).toBe(moved.history);

    const undone = undoWorkflowHistory(moved.history);
    expect(undone.changed).toBe(true);
    expect(undone.history.present.revision).toBe(2);
    expect(undone.history.present.content.graph.nodes[0]?.position).toEqual({ x: 120, y: 180 });
    expect(undone.history.future).toHaveLength(1);

    const redone = redoWorkflowHistory(undone.history);
    expect(redone.changed).toBe(true);
    expect(redone.history.present.revision).toBe(3);
    expect(redone.history.present.content.graph.nodes[0]?.position).toEqual({ x: 90, y: 90 });
  });

  it("records a batched canvas gesture as one undo checkpoint", () => {
    const initial = createWorkflowDraft("workflow-batched-gesture", {
      name: "Batched gesture",
      description: "Insert a connected step atomically.",
      graph: { nodes: [triggerNode], edges: [] },
    });
    const history = createWorkflowHistory(initial);
    const inserted = applyWorkflowHistoryCommand(history, {
      type: "batch",
      commands: [
        { type: "node.add", node: agentNode },
        {
          type: "edge.connect",
          edge: {
            id: "edge-trigger-agent",
            kind: "success",
            sourceNodeId: triggerNode.id,
            targetNodeId: agentNode.id,
          },
        },
      ],
    });

    expect(inserted).toMatchObject({ accepted: true, changed: true });
    expect(inserted.history.past).toHaveLength(1);
    expect(inserted.history.present.revision).toBe(1);
    const undone = undoWorkflowHistory(inserted.history);
    expect(undone.history.present.content.graph).toEqual({ nodes: [triggerNode], edges: [] });
  });

  it("publishes immutable, incrementing versions and rejects unchanged drafts", () => {
    const draft = createPublishableDraft();
    const template = {
      id: draft.templateId,
      workspaceId: "workspace-kiso-labs",
      draft,
      versions: [],
      archivedAt: null,
    };

    const first = publishWorkflow(template, {
      publishedAt: "2026-07-12T18:00:00.000Z",
      references: { agentProfileIds: ["agent-profile-planning"] },
    });
    expect(first.ok).toBe(true);
    if (!first.ok) throw new Error(first.reason);
    expect(first.version).toMatchObject({
      id: "workflow-feature-v1",
      templateId: "workflow-feature",
      version: 1,
      publishedAt: "2026-07-12T18:00:00.000Z",
    });
    expect(first.version.checksum).toMatch(/^[0-9a-f]{8}$/);
    expect(template.versions).toEqual([]);

    const unchanged = publishWorkflow(first.template, {
      publishedAt: "2026-07-12T18:05:00.000Z",
      references: { agentProfileIds: ["agent-profile-planning"] },
    });
    expect(unchanged).toMatchObject({
      ok: false,
      reason: "The draft matches the latest published version.",
    });

    const edited = applyWorkflowCommand(first.template.draft, {
      type: "nodes.move",
      positions: { [triggerNode.id]: { x: 80, y: 80 } },
    });
    const second = publishWorkflow(
      { ...first.template, draft: edited.draft },
      {
        publishedAt: "2026-07-12T18:10:00.000Z",
        references: { agentProfileIds: ["agent-profile-planning"] },
      },
    );
    expect(second.ok).toBe(true);
    if (!second.ok) throw new Error(second.reason);
    expect(second.version.version).toBe(2);
    expect(second.template.versions).toHaveLength(2);
    expect(second.template.versions[0]).toBe(first.version);
    expect(second.version.checksum).not.toBe(first.version.checksum);
  });
});

import type { Connection } from "@xyflow/react";
import { describe, expect, it } from "vite-plus/test";

import { WORKFLOW_CANVAS_EDGE_TYPE } from "./WorkflowCanvasEdge";
import { WORKFLOW_CANVAS_NODE_TYPE, WORKFLOW_INPUT_HANDLE_ID } from "./WorkflowCanvasNode";
import {
  createWorkflowCanvasElements,
  workflowConnectionToEdge,
  workflowNodePositionsCommand,
} from "./workflowCanvasAdapter";
import {
  createWorkflowDraft,
  type WorkflowNode,
  type WorkflowValidationReport,
} from "./workflowGraph";

const trigger: WorkflowNode = {
  id: "trigger-ready",
  kind: "trigger",
  name: "Issue enters Ready",
  position: { x: 100, y: 180 },
  disabled: false,
  config: { event: "issue-status", status: "Ready" },
};

const approval: WorkflowNode = {
  id: "approval-plan",
  kind: "approval",
  name: "Approve plan",
  position: { x: 420, y: 180 },
  disabled: false,
  config: {
    instructions: "Review the implementation plan.",
    approverGroup: "Project maintainers",
    timeoutMinutes: 1_440,
    timeoutOutcome: "reject",
  },
};

function draftWithApproval() {
  return createWorkflowDraft("workflow-feature", {
    name: "Feature delivery",
    description: "Plan and approve project work.",
    graph: {
      nodes: [trigger, approval],
      edges: [
        {
          id: "edge-trigger-approval",
          kind: "success",
          sourceNodeId: trigger.id,
          targetNodeId: approval.id,
        },
      ],
    },
  });
}

describe("workflow canvas adapter", () => {
  it("creates controlled canvas elements with findings, test state, and callbacks", () => {
    const draft = draftWithApproval();
    const validation: WorkflowValidationReport = {
      canPublish: false,
      diagnostics: [
        {
          severity: "warning",
          code: "approval-config-invalid",
          message: "Confirm the approval timeout.",
          nodeId: approval.id,
        },
        {
          severity: "error",
          code: "invalid-edge-outcome",
          message: "The outcome needs attention.",
          edgeId: "edge-trigger-approval",
        },
      ],
    };
    const onAddAfter = () => undefined;
    const onInspectNode = () => undefined;
    const onTestNode = () => undefined;
    const onInspectEdge = () => undefined;

    const elements = createWorkflowCanvasElements({
      draft,
      validation,
      testStates: { [approval.id]: "waiting-for-approval" },
      bindingLabels: { [approval.id]: "Active work" },
      onAddAfter,
      onInspectNode,
      onTestNode,
      onInspectEdge,
    });

    expect(elements.nodes).toHaveLength(2);
    expect(elements.nodes[1]).toMatchObject({
      id: approval.id,
      type: WORKFLOW_CANVAS_NODE_TYPE,
      position: approval.position,
      data: {
        node: approval,
        findings: [{ severity: "warning", message: "Confirm the approval timeout." }],
        testState: "waiting-for-approval",
        bindingLabel: "Active work",
        onAddAfter,
        onInspect: onInspectNode,
        onTest: onTestNode,
      },
    });
    expect(elements.edges[0]).toMatchObject({
      id: "edge-trigger-approval",
      type: WORKFLOW_CANVAS_EDGE_TYPE,
      source: trigger.id,
      target: approval.id,
      sourceHandle: "success",
      targetHandle: WORKFLOW_INPUT_HANDLE_ID,
      label: "Success",
      data: {
        invalid: true,
        finding: "The outcome needs attention.",
        onInspect: onInspectEdge,
      },
    });
  });

  it("converts a legal source handle into its typed workflow outcome", () => {
    const draft = draftWithApproval();
    const connection: Connection = {
      source: approval.id,
      target: "target-node",
      sourceHandle: "rejected",
      targetHandle: WORKFLOW_INPUT_HANDLE_ID,
    };
    const target: WorkflowNode = {
      ...approval,
      id: "target-node",
      name: "Acknowledge rejection",
    };
    const withTarget = createWorkflowDraft(draft.templateId, {
      ...draft.content,
      graph: { ...draft.content.graph, nodes: [...draft.content.graph.nodes, target] },
    });

    expect(workflowConnectionToEdge(withTarget, connection, "edge-rejected")).toEqual({
      ok: true,
      edge: {
        id: "edge-rejected",
        kind: "approval",
        outcome: "rejected",
        sourceNodeId: approval.id,
        targetNodeId: target.id,
      },
    });
  });

  it("rejects missing and illegal connection handles", () => {
    const draft = draftWithApproval();
    const connection = (sourceHandle: string | null): Connection => ({
      source: approval.id,
      target: trigger.id,
      sourceHandle,
      targetHandle: WORKFLOW_INPUT_HANDLE_ID,
    });

    expect(workflowConnectionToEdge(draft, connection(null), "edge-missing")).toMatchObject({
      ok: false,
      reason: "Choose an output handle before connecting nodes.",
    });
    expect(workflowConnectionToEdge(draft, connection("unknown"), "edge-illegal")).toMatchObject({
      ok: false,
      reason: "unknown is not an output of Approve plan.",
    });
    expect(
      workflowConnectionToEdge(draft, connection("approved"), "edge-trigger-target"),
    ).toMatchObject({
      ok: false,
      reason: "Trigger nodes cannot receive incoming connections.",
    });
  });

  it("rejects reused outputs and graph cycles at connection time", () => {
    const duplicate = workflowConnectionToEdge(
      draftWithApproval(),
      {
        source: trigger.id,
        target: approval.id,
        sourceHandle: "success",
        targetHandle: WORKFLOW_INPUT_HANDLE_ID,
      },
      "edge-duplicate-output",
    );
    expect(duplicate).toMatchObject({
      ok: false,
      reason: "Continue is already connected. Remove its current edge first.",
    });

    const retry = {
      maxRetries: 1,
      strategy: "fixed" as const,
      delaySeconds: 5,
      maxDelaySeconds: 5,
    };
    const first: WorkflowNode = {
      id: "agent-first",
      kind: "agent",
      name: "First agent",
      position: { x: 360, y: 100 },
      disabled: false,
      config: {
        agentProfileId: "agent-profile-codex",
        prompt: "First",
        workingDirectory: ".",
        tools: [],
        timeoutSeconds: 60,
        retry,
      },
    };
    const second: WorkflowNode = {
      ...first,
      id: "agent-second",
      name: "Second agent",
      position: { x: 680, y: 100 },
    };
    const cyclicDraft = createWorkflowDraft("workflow-cycle", {
      name: "Cycle check",
      description: "Reject cycles",
      graph: {
        nodes: [trigger, first, second],
        edges: [
          {
            id: "edge-trigger-first",
            kind: "success",
            sourceNodeId: trigger.id,
            targetNodeId: first.id,
          },
          {
            id: "edge-first-second",
            kind: "success",
            sourceNodeId: first.id,
            targetNodeId: second.id,
          },
        ],
      },
    });
    expect(
      workflowConnectionToEdge(
        cyclicDraft,
        {
          source: second.id,
          target: first.id,
          sourceHandle: "success",
          targetHandle: WORKFLOW_INPUT_HANDLE_ID,
        },
        "edge-second-first",
      ),
    ).toMatchObject({
      ok: false,
      reason:
        "This connection would create a cycle. Configure bounded retries on the step instead.",
    });
  });

  it("creates one batched domain movement command from final canvas positions", () => {
    const command = workflowNodePositionsCommand([
      { id: trigger.id, position: { x: 140, y: 220 } },
      { id: approval.id, position: { x: 480, y: 260 } },
    ]);

    expect(command).toEqual({
      type: "nodes.move",
      positions: {
        [trigger.id]: { x: 140, y: 220 },
        [approval.id]: { x: 480, y: 260 },
      },
    });
    expect(workflowNodePositionsCommand([])).toBeNull();
  });
});

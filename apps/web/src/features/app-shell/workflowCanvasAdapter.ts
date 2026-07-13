import type { Connection } from "@xyflow/react";

import {
  WORKFLOW_CANVAS_EDGE_TYPE,
  type WorkflowCanvasEdgeElement,
  workflowEdgeLabel,
} from "./WorkflowCanvasEdge";
import {
  WORKFLOW_CANVAS_NODE_TYPE,
  WORKFLOW_INPUT_HANDLE_ID,
  type WorkflowCanvasNodeElement,
  type WorkflowNodeTestState,
  getWorkflowSourceHandleId,
} from "./WorkflowCanvasNode";
import type {
  WorkflowCommand,
  WorkflowDraft,
  WorkflowEdge,
  WorkflowValidationReport,
} from "./workflowGraph";
import { validateWorkflowDraft } from "./workflowGraph";
import { workflowNodeOutputs } from "./workflowNodeCatalog";

export interface CreateWorkflowCanvasElementsInput {
  readonly draft: WorkflowDraft;
  readonly validation: WorkflowValidationReport;
  readonly testStates?: Readonly<Record<string, WorkflowNodeTestState>>;
  readonly bindingLabels?: Readonly<Record<string, string>>;
  readonly onAddAfter?: (nodeId: string) => void;
  readonly onInspectNode?: (nodeId: string) => void;
  readonly onTestNode?: (nodeId: string) => void;
  readonly onInspectEdge?: (edgeId: string) => void;
}

export interface WorkflowCanvasElements {
  readonly nodes: WorkflowCanvasNodeElement[];
  readonly edges: WorkflowCanvasEdgeElement[];
}

export type WorkflowConnectionResult =
  | { readonly ok: true; readonly edge: WorkflowEdge }
  | { readonly ok: false; readonly reason: string };

export function createWorkflowCanvasElements({
  draft,
  bindingLabels = {},
  onAddAfter,
  onInspectEdge,
  onInspectNode,
  onTestNode,
  testStates = {},
  validation,
}: CreateWorkflowCanvasElementsInput): WorkflowCanvasElements {
  const nodeFindings = new Map<
    string,
    Array<{ readonly severity: "error" | "warning"; readonly message: string }>
  >();
  const edgeFindings = new Map<string, typeof validation.diagnostics>();
  for (const diagnostic of validation.diagnostics) {
    if (diagnostic.nodeId) {
      const findings = nodeFindings.get(diagnostic.nodeId) ?? [];
      findings.push({ severity: diagnostic.severity, message: diagnostic.message });
      nodeFindings.set(diagnostic.nodeId, findings);
    }
    if (diagnostic.edgeId) {
      edgeFindings.set(diagnostic.edgeId, [
        ...(edgeFindings.get(diagnostic.edgeId) ?? []),
        diagnostic,
      ]);
    }
  }

  const nodes: WorkflowCanvasNodeElement[] = draft.content.graph.nodes.map((node) => {
    const findings = nodeFindings.get(node.id);
    const testState = testStates[node.id];
    return {
      id: node.id,
      type: WORKFLOW_CANVAS_NODE_TYPE,
      position: node.position,
      draggable: !node.disabled,
      connectable: !node.disabled,
      data: {
        node,
        ...(findings?.length ? { findings } : {}),
        ...(testState ? { testState } : {}),
        ...(bindingLabels[node.id] ? { bindingLabel: bindingLabels[node.id] } : {}),
        ...(onAddAfter ? { onAddAfter } : {}),
        ...(onInspectNode ? { onInspect: onInspectNode } : {}),
        ...(onTestNode ? { onTest: onTestNode } : {}),
      },
    };
  });

  const edges: WorkflowCanvasEdgeElement[] = draft.content.graph.edges.map((edge) => {
    const findings = edgeFindings.get(edge.id) ?? [];
    const finding = findings.map(({ message }) => message).join("\n");
    return {
      id: edge.id,
      type: WORKFLOW_CANVAS_EDGE_TYPE,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      sourceHandle: getWorkflowSourceHandleId(edge),
      targetHandle: WORKFLOW_INPUT_HANDLE_ID,
      label: workflowEdgeLabel(edge),
      data: {
        edge,
        invalid: findings.some(({ severity }) => severity === "error"),
        ...(finding ? { finding } : {}),
        ...(onInspectEdge ? { onInspect: onInspectEdge } : {}),
      },
    };
  });

  return { nodes, edges };
}

export function workflowConnectionToEdge(
  draft: WorkflowDraft,
  connection: Connection,
  edgeId: string,
): WorkflowConnectionResult {
  if (!connection.sourceHandle) {
    return { ok: false, reason: "Choose an output handle before connecting nodes." };
  }
  const sourceNode = draft.content.graph.nodes.find(({ id }) => id === connection.source);
  if (!sourceNode) {
    return { ok: false, reason: "The source node no longer exists." };
  }
  const output = workflowNodeOutputs(sourceNode).find(({ id }) => id === connection.sourceHandle);
  if (!output) {
    return {
      ok: false,
      reason: `${connection.sourceHandle} is not an output of ${sourceNode.name}.`,
    };
  }
  const targetNode = draft.content.graph.nodes.find(({ id }) => id === connection.target);
  if (!targetNode) {
    return { ok: false, reason: "The target node no longer exists." };
  }
  if (targetNode.kind === "trigger") {
    return { ok: false, reason: "Trigger nodes cannot receive incoming connections." };
  }
  if (connection.targetHandle !== null && connection.targetHandle !== WORKFLOW_INPUT_HANDLE_ID) {
    return { ok: false, reason: `${connection.targetHandle} is not a workflow input handle.` };
  }
  if (sourceNode.id === targetNode.id) {
    return { ok: false, reason: "A node cannot connect to itself." };
  }
  if (sourceNode.disabled || targetNode.disabled) {
    return { ok: false, reason: "Enable both nodes before connecting them." };
  }
  if (
    draft.content.graph.edges.some(
      (edge) =>
        edge.sourceNodeId === sourceNode.id &&
        getWorkflowSourceHandleId(edge) === connection.sourceHandle,
    )
  ) {
    return {
      ok: false,
      reason: `${output.label} is already connected. Remove its current edge first.`,
    };
  }
  if (draft.content.graph.edges.some(({ id }) => id === edgeId)) {
    return { ok: false, reason: `Edge ${edgeId} already exists.` };
  }

  const base = {
    id: edgeId,
    sourceNodeId: sourceNode.id,
    targetNodeId: targetNode.id,
  };
  switch (output.edge.kind) {
    case "success":
      return acceptConnectionEdge(draft, { ...base, kind: "success" });
    case "failure":
      return acceptConnectionEdge(draft, { ...base, kind: "failure" });
    case "approval":
      return acceptConnectionEdge(draft, {
        ...base,
        kind: "approval",
        outcome: output.edge.outcome,
      });
    case "branch":
      return acceptConnectionEdge(draft, {
        ...base,
        kind: "branch",
        caseId: output.edge.caseId,
      });
  }
}

function acceptConnectionEdge(draft: WorkflowDraft, edge: WorkflowEdge): WorkflowConnectionResult {
  const candidate = {
    ...draft,
    content: {
      ...draft.content,
      graph: {
        ...draft.content.graph,
        edges: [...draft.content.graph.edges, edge],
      },
    },
  };
  if (validateWorkflowDraft(candidate).diagnostics.some(({ code }) => code === "graph-cycle")) {
    return {
      ok: false,
      reason:
        "This connection would create a cycle. Configure bounded retries on the step instead.",
    };
  }
  return { ok: true, edge };
}

export function workflowNodePositionsCommand(
  nodes: readonly Pick<WorkflowCanvasNodeElement, "id" | "position">[],
): Extract<WorkflowCommand, { readonly type: "nodes.move" }> | null {
  if (nodes.length === 0) return null;
  return {
    type: "nodes.move",
    positions: Object.fromEntries(nodes.map(({ id, position }) => [id, position])),
  };
}

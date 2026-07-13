import { describe, expect, it } from "vite-plus/test";

import {
  WORKFLOW_NODE_KINDS,
  createWorkflowNode,
  workflowNodeOutputs,
} from "./workflowNodeCatalog";

describe("workflow node catalog", () => {
  it("creates every supported typed node with editable defaults", () => {
    const nodes = WORKFLOW_NODE_KINDS.map((kind, index) =>
      createWorkflowNode(kind, `node-${kind}`, { x: index * 240, y: 120 }),
    );

    expect(nodes.map(({ kind }) => kind)).toEqual(WORKFLOW_NODE_KINDS);
    expect(nodes.every(({ name }) => name.length > 0)).toBe(true);
    expect(nodes.every(({ disabled }) => disabled === false)).toBe(true);
  });

  it("defines typed outputs for executable, approval, and branch nodes", () => {
    const agent = createWorkflowNode("agent", "agent", { x: 0, y: 0 });
    const approval = createWorkflowNode("approval", "approval", { x: 0, y: 0 });
    const branch = createWorkflowNode("branch", "branch", { x: 0, y: 0 });

    expect(workflowNodeOutputs(agent).map(({ id }) => id)).toEqual(["success", "failure"]);
    expect(workflowNodeOutputs(approval).map(({ id }) => id)).toEqual([
      "approved",
      "rejected",
      "timed-out",
    ]);
    expect(workflowNodeOutputs(branch).map(({ id }) => id)).toEqual(["branch-case-yes", "default"]);
  });
});

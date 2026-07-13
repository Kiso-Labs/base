import { describe, expect, it } from "vite-plus/test";
import type { StateStorage } from "zustand/middleware";

import {
  createWorkflowWorkspaceStore,
  deriveWorkflowSummaries,
  workflowNodeTestKey,
} from "./workflowWorkspaceStore";
import type { WorkflowNode } from "./workflowGraph";

const BINDING_REFERENCES = {
  projectIds: ["project-base-desktop", "project-base-relay"],
  views: [
    {
      id: "view-project-base-desktop-active",
      projectId: "project-base-desktop",
      layout: "board" as const,
    },
    {
      id: "view-project-base-desktop-list",
      projectId: "project-base-desktop",
      layout: "list" as const,
    },
    {
      id: "view-project-base-relay-active",
      projectId: "project-base-relay",
      layout: "board" as const,
    },
  ],
};

describe("workflow workspace store", () => {
  it("seeds every workspace template as a validated, editable workflow graph", () => {
    const store = createWorkflowWorkspaceStore();
    const state = store.getState();

    expect(state.templates.map(({ id }) => id)).toEqual([
      "workflow-reliable-feature-delivery",
      "workflow-bug-fix",
      "workflow-pre-push-review",
      "workflow-concurrency-safety",
    ]);
    expect(state.templates.map(({ versions }) => versions.at(-1)?.version)).toEqual([7, 4, 3, 2]);
    expect(
      state.templates.map(({ draft }) => [
        draft.templateId,
        [...new Set(draft.content.graph.nodes.map(({ kind }) => kind))].sort(),
      ]),
    ).toEqual(
      state.templates.map(({ id }) => [
        id,
        ["agent", "approval", "branch", "hook", "test", "trigger"],
      ]),
    );
    expect(state.templates.map(({ id }) => state.validationByTemplateId[id]?.canPublish)).toEqual([
      true,
      true,
      true,
      true,
    ]);

    expect(
      deriveWorkflowSummaries(state.templates).map(
        ({ id, status, trigger, version, successRate }) => ({
          id,
          status,
          trigger,
          version,
          successRate,
        }),
      ),
    ).toEqual([
      {
        id: "workflow-reliable-feature-delivery",
        status: "Published",
        trigger: "Issue enters Ready",
        version: 7,
        successRate: 92,
      },
      {
        id: "workflow-bug-fix",
        status: "Published",
        trigger: "Manual run",
        version: 4,
        successRate: 88,
      },
      {
        id: "workflow-pre-push-review",
        status: "Published",
        trigger: "Push attempted",
        version: 3,
        successRate: 97,
      },
      {
        id: "workflow-concurrency-safety",
        status: "Draft",
        trigger: "Issue queued",
        version: 2,
        successRate: null,
      },
    ]);
  });

  it("executes graph commands with isolated per-template undo and redo history", () => {
    const store = createWorkflowWorkspaceStore();
    const firstTemplate = store.getState().templates[0]!;
    const secondTemplate = store.getState().templates[1]!;
    const firstNode = firstTemplate.draft.content.graph.nodes[0]!;
    const secondNode = secondTemplate.draft.content.graph.nodes[0]!;

    expect(
      store.getState().executeCommand(firstTemplate.id, {
        type: "nodes.move",
        positions: { [firstNode.id]: { x: 120, y: 96 } },
      }),
    ).toMatchObject({ ok: true, changed: true });
    expect(
      store.getState().executeCommand(secondTemplate.id, {
        type: "nodes.move",
        positions: { [secondNode.id]: { x: 88, y: 144 } },
      }),
    ).toMatchObject({ ok: true, changed: true });
    expect(store.getState().historyByTemplateId[firstTemplate.id]?.past).toHaveLength(1);
    expect(store.getState().historyByTemplateId[secondTemplate.id]?.past).toHaveLength(1);

    expect(store.getState().undo(firstTemplate.id)).toEqual({ ok: true, changed: true });
    expect(
      store.getState().templates.find(({ id }) => id === firstTemplate.id)?.draft.content.graph
        .nodes[0]?.position,
    ).toEqual(firstNode.position);
    expect(
      store.getState().templates.find(({ id }) => id === secondTemplate.id)?.draft.content.graph
        .nodes[0]?.position,
    ).toEqual({ x: 88, y: 144 });

    expect(store.getState().redo(firstTemplate.id)).toEqual({ ok: true, changed: true });
    expect(
      store.getState().templates.find(({ id }) => id === firstTemplate.id)?.draft.content.graph
        .nodes[0]?.position,
    ).toEqual({ x: 120, y: 96 });
  });

  it("updates draft metadata through the same bounded history", () => {
    const store = createWorkflowWorkspaceStore();
    const template = store.getState().templates[0]!;

    expect(
      store.getState().updateMetadata(template.id, {
        name: "Reliable delivery",
        description: "Plan, implement, validate, and review project work.",
      }),
    ).toEqual({ ok: true, changed: true });

    const updated = store.getState().templates.find(({ id }) => id === template.id)!;
    expect(updated.draft).toMatchObject({
      revision: 1,
      content: {
        name: "Reliable delivery",
        description: "Plan, implement, validate, and review project work.",
      },
    });
    expect(store.getState().historyByTemplateId[template.id]?.past).toHaveLength(1);
    expect(deriveWorkflowSummaries(store.getState().templates)[0]).toMatchObject({
      name: "Reliable delivery",
      status: "Draft",
      version: 7,
    });

    expect(store.getState().undo(template.id)).toEqual({ ok: true, changed: true });
    expect(store.getState().templates[0]?.draft.content.name).toBe(template.draft.content.name);
  });

  it("creates and selects workspace templates with per-template viewports and node selection", () => {
    const store = createWorkflowWorkspaceStore();
    const firstTemplate = store.getState().templates[0]!;
    expect(store.getState().selectedTemplateId).toBe(firstTemplate.id);

    const created = store.getState().createTemplate({
      name: "Release notes",
      description: "Summarize the changes shipped in a project release.",
    });
    expect(created).toMatchObject({
      id: "workflow-release-notes",
      workspaceId: "workspace-kiso-labs",
      versions: [],
      draft: {
        revision: 0,
        content: {
          name: "Release notes",
          graph: { nodes: [{ kind: "trigger", config: { event: "manual" } }], edges: [] },
        },
      },
    });
    expect(store.getState()).toMatchObject({
      selectedTemplateId: created.id,
      selectedNodeId: null,
    });

    expect(store.getState().selectTemplate(firstTemplate.id)).toEqual({ ok: true, changed: true });
    expect(store.getState().setViewport(firstTemplate.id, { x: 32, y: -12, zoom: 1.15 })).toEqual({
      ok: true,
      changed: true,
    });
    expect(store.getState().viewportByTemplateId[firstTemplate.id]).toEqual({
      x: 32,
      y: -12,
      zoom: 1.15,
    });

    const firstNodeId = firstTemplate.draft.content.graph.nodes[0]!.id;
    expect(store.getState().selectNode(firstNodeId)).toEqual({ ok: true, changed: true });
    expect(store.getState().selectedNodeId).toBe(firstNodeId);
    expect(store.getState().selectNode("node-missing")).toMatchObject({
      ok: false,
      reason: "Node node-missing does not exist in the selected workflow.",
    });
  });

  it("publishes an immutable version and derives the catalog from the latest release", () => {
    const store = createWorkflowWorkspaceStore({
      now: () => "2026-07-12T20:00:00.000Z",
    });
    const templateId = "workflow-concurrency-safety";
    const priorVersion = store.getState().templates.find(({ id }) => id === templateId)!
      .versions[0]!;
    const priorContent = structuredClone(priorVersion.content);

    const result = store.getState().publish(templateId);
    expect(result).toMatchObject({
      ok: true,
      version: {
        id: "workflow-concurrency-safety:v3",
        templateId,
        version: 3,
        publishedAt: "2026-07-12T20:00:00.000Z",
      },
    });
    const updated = store.getState().templates.find(({ id }) => id === templateId)!;
    expect(updated.versions).toHaveLength(2);
    expect(updated.versions[0]?.content).toEqual(priorContent);
    expect(updated.versions[0]).toBe(priorVersion);
    expect(deriveWorkflowSummaries(store.getState().templates).at(-1)).toMatchObject({
      id: templateId,
      status: "Published",
      version: 3,
    });

    expect(store.getState().publish(templateId)).toMatchObject({
      ok: false,
      reason: "The draft matches the latest published version.",
    });
  });

  it("records synthetic node and full-workflow test results from current validation", () => {
    const scheduled: Array<() => void> = [];
    const store = createWorkflowWorkspaceStore({
      now: () => "2026-07-12T20:15:00.000Z",
      schedule: (callback) => scheduled.push(callback),
    });
    const template = store.getState().templates[0]!;
    const agent = template.draft.content.graph.nodes.find(
      (node): node is Extract<WorkflowNode, { readonly kind: "agent" }> => node.kind === "agent",
    )!;
    expect(
      store.getState().testStateByNodeKey[workflowNodeTestKey(template.id, agent.id)],
    ).toMatchObject({ status: "idle" });
    expect(store.getState().fullTestStateByTemplateId[template.id]).toMatchObject({
      status: "idle",
    });

    expect(store.getState().testNode(agent.id)).toMatchObject({
      status: "running",
      updatedAt: "2026-07-12T20:15:00.000Z",
    });
    scheduled.shift()?.();
    expect(
      store.getState().testStateByNodeKey[workflowNodeTestKey(template.id, agent.id)],
    ).toMatchObject({ status: "passed" });
    expect(store.getState().testWorkflow(template.id)).toMatchObject({
      status: "running",
      updatedAt: "2026-07-12T20:15:00.000Z",
    });
    scheduled.shift()?.();
    expect(store.getState().fullTestStateByTemplateId[template.id]).toMatchObject({
      status: "passed",
    });

    store.getState().executeCommand(template.id, {
      type: "nodes.move",
      positions: { [agent.id]: { x: agent.position.x + 40, y: agent.position.y } },
    });
    expect(
      store.getState().testStateByNodeKey[workflowNodeTestKey(template.id, agent.id)],
    ).toMatchObject({ status: "passed" });
    expect(store.getState().fullTestStateByTemplateId[template.id]).toMatchObject({
      status: "passed",
    });

    expect(
      store.getState().executeCommand(template.id, {
        type: "node.update",
        node: { ...agent, config: { ...agent.config, prompt: " " } },
      }),
    ).toEqual({ ok: true, changed: true });
    expect(
      store.getState().testStateByNodeKey[workflowNodeTestKey(template.id, agent.id)],
    ).toMatchObject({ status: "idle" });
    expect(store.getState().testNode(agent.id)).toMatchObject({
      status: "running",
    });
    scheduled.shift()?.();
    expect(
      store.getState().testStateByNodeKey[workflowNodeTestKey(template.id, agent.id)],
    ).toMatchObject({
      status: "failed",
      message: "Agent steps require a profile, prompt, and timeout.",
    });
    expect(store.getState().testWorkflow(template.id)).toMatchObject({
      status: "running",
    });
    scheduled.shift()?.();
    expect(store.getState().fullTestStateByTemplateId[template.id]).toMatchObject({
      status: "failed",
      message: "1 blocking validation error",
    });
  });

  it("surfaces approval tests as waiting for a human decision", () => {
    const store = createWorkflowWorkspaceStore();
    const template = store.getState().templates[0]!;
    const approval = template.draft.content.graph.nodes.find(({ kind }) => kind === "approval")!;

    expect(store.getState().testNode(approval.id)).toMatchObject({
      status: "waiting-for-approval",
      message: "Waiting for maintainers approval.",
    });
    expect(
      store.getState().testStateByNodeKey[workflowNodeTestKey(template.id, approval.id)],
    ).toMatchObject({ status: "waiting-for-approval" });
  });

  it("persists project-scoped trigger bindings to Kanban views without changing the template", () => {
    const store = createWorkflowWorkspaceStore();
    const template = store.getState().templates[0]!;
    const trigger = template.draft.content.graph.nodes.find(({ kind }) => kind === "trigger")!;

    expect(
      store.getState().setTriggerBinding(
        {
          projectId: "project-base-desktop",
          templateId: template.id,
          nodeId: trigger.id,
          viewId: "view-project-base-desktop-active",
        },
        BINDING_REFERENCES,
      ),
    ).toEqual({ ok: true, changed: true });
    expect(
      store.getState().triggerBindings[`project-base-desktop:${template.id}:${trigger.id}`],
    ).toEqual({
      projectId: "project-base-desktop",
      templateId: template.id,
      nodeId: trigger.id,
      viewId: "view-project-base-desktop-active",
    });
    expect(store.getState().templates[0]).toBe(template);

    expect(
      store.getState().setTriggerBinding(
        {
          projectId: "project-base-desktop",
          templateId: template.id,
          nodeId: trigger.id,
          viewId: "view-project-base-relay-active",
        },
        BINDING_REFERENCES,
      ),
    ).toMatchObject({
      ok: false,
      reason: "The selected Kanban board view belongs to another project.",
    });
    expect(
      store.getState().setTriggerBinding(
        {
          projectId: "project-base-desktop",
          templateId: template.id,
          nodeId: trigger.id,
          viewId: "view-project-base-desktop-list",
        },
        BINDING_REFERENCES,
      ),
    ).toMatchObject({
      ok: false,
      reason: "Workflow triggers can bind only to Kanban board views.",
    });

    const manualTemplate = store.getState().templates.find(({ id }) => id === "workflow-bug-fix")!;
    const manualTrigger = manualTemplate.draft.content.graph.nodes.find(
      ({ kind }) => kind === "trigger",
    )!;
    expect(
      store.getState().setTriggerBinding(
        {
          projectId: "project-base-desktop",
          templateId: manualTemplate.id,
          nodeId: manualTrigger.id,
          viewId: "view-project-base-desktop-active",
        },
        BINDING_REFERENCES,
      ),
    ).toMatchObject({
      ok: false,
      reason: "Only issue status and issue queued triggers can bind to a Kanban board view.",
    });
  });

  it("persists workspace templates and view state while rebuilding session-only state", async () => {
    const storage = createMemoryStorage();
    const storageKey = "workflow-workspace-test";
    const firstStore = createWorkflowWorkspaceStore({ storage, storageKey });
    const firstTemplate = firstStore.getState().templates[0]!;
    const secondTemplate = firstStore.getState().templates[1]!;
    const firstNode = firstTemplate.draft.content.graph.nodes[0]!;
    const secondNode = secondTemplate.draft.content.graph.nodes[0]!;

    firstStore.getState().executeCommand(firstTemplate.id, {
      type: "nodes.move",
      positions: { [firstNode.id]: { x: 240, y: 128 } },
    });
    firstStore.getState().setViewport(firstTemplate.id, { x: -44, y: 18, zoom: 0.94 });
    firstStore.getState().selectTemplate(secondTemplate.id);
    firstStore.getState().selectNode(secondNode.id);
    firstStore.getState().testNode(secondNode.id);
    firstStore.getState().setTriggerBinding(
      {
        projectId: "project-base-desktop",
        templateId: firstTemplate.id,
        nodeId: firstNode.id,
        viewId: "view-project-base-desktop-active",
      },
      BINDING_REFERENCES,
    );

    const persisted = JSON.parse((await storage.getItem(storageKey)) ?? "{}") as {
      readonly state?: Readonly<Record<string, unknown>>;
    };
    expect(Object.keys(persisted.state ?? {}).sort()).toEqual([
      "selectedTemplateId",
      "templates",
      "triggerBindings",
      "viewportByTemplateId",
    ]);

    const hydratedStore = createWorkflowWorkspaceStore({
      storage,
      storageKey,
      bindingReferences: BINDING_REFERENCES,
    });
    const hydrated = hydratedStore.getState();
    expect(hydrated.selectedTemplateId).toBe(secondTemplate.id);
    expect(hydrated.viewportByTemplateId[firstTemplate.id]).toEqual({
      x: -44,
      y: 18,
      zoom: 0.94,
    });
    expect(
      hydrated.templates[0]?.draft.content.graph.nodes.find(({ id }) => id === firstNode.id)
        ?.position,
    ).toEqual({ x: 240, y: 128 });
    expect(hydrated.selectedNodeId).toBeNull();
    expect(
      hydrated.triggerBindings[`project-base-desktop:${firstTemplate.id}:${firstNode.id}`]?.viewId,
    ).toBe("view-project-base-desktop-active");
    expect(hydrated.historyByTemplateId[firstTemplate.id]?.past).toEqual([]);
    expect(
      hydrated.testStateByNodeKey[workflowNodeTestKey(secondTemplate.id, secondNode.id)],
    ).toMatchObject({ status: "idle" });
    expect(hydrated.validationByTemplateId[firstTemplate.id]?.canPublish).toBe(true);

    const staleBindingStore = createWorkflowWorkspaceStore({
      storage,
      storageKey,
      bindingReferences: { projectIds: BINDING_REFERENCES.projectIds, views: [] },
    });
    expect(staleBindingStore.getState().triggerBindings).toEqual({});
  });

  it("falls back to seeded templates when persisted workflow data is malformed", async () => {
    const storage = createMemoryStorage();
    const storageKey = "workflow-workspace-malformed";
    await storage.setItem(
      storageKey,
      JSON.stringify({
        state: { templates: [{ id: "workflow-broken", draft: {} }] },
        version: 3,
      }),
    );

    const store = createWorkflowWorkspaceStore({ storage, storageKey });

    expect(store.getState().templates.map(({ id }) => id)).toEqual([
      "workflow-reliable-feature-delivery",
      "workflow-bug-fix",
      "workflow-pre-push-review",
      "workflow-concurrency-safety",
    ]);
    expect(
      store.getState().validationByTemplateId["workflow-reliable-feature-delivery"],
    ).toMatchObject({ canPublish: true });
  });
});

function createMemoryStorage(): StateStorage {
  const values = new Map<string, string>();
  return {
    getItem: (name) => values.get(name) ?? null,
    setItem: (name, value) => {
      values.set(name, value);
    },
    removeItem: (name) => {
      values.delete(name);
    },
  };
}

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

import { resolveStorage } from "~/lib/storage";

import {
  applyWorkflowHistoryCommand,
  createWorkflowDraft,
  createWorkflowHistory,
  publishWorkflow,
  redoWorkflowHistory,
  undoWorkflowHistory,
  validateWorkflowDraft,
  workflowContentChecksum,
  type WorkflowCommand,
  type WorkflowHistory,
  type WorkflowNode,
  type WorkflowPublishResult,
  type WorkflowTemplate,
  type WorkflowTriggerConfig,
  type WorkflowValidationReport,
} from "./workflowGraph";
import { BASE_WORKFLOW_SEED_TEMPLATES, WORKFLOW_SEED_SUCCESS_RATES } from "./workflowSeedTemplates";
import type { BaseWorkflowSummary } from "./workspaceRepository";

const DEFAULT_WORKFLOW_VIEWPORT: WorkflowViewport = { x: 0, y: 0, zoom: 0.82 };
const IDLE_WORKFLOW_TEST_STATE: WorkflowTestState = {
  status: "idle",
  message: "Not tested",
  durationMs: null,
  updatedAt: null,
};

export interface WorkflowWorkspaceStore {
  readonly templates: readonly WorkflowTemplate[];
  readonly selectedTemplateId: string | null;
  readonly selectedNodeId: string | null;
  readonly viewportByTemplateId: Readonly<Record<string, WorkflowViewport>>;
  readonly historyByTemplateId: Readonly<Record<string, WorkflowHistory>>;
  readonly validationByTemplateId: Readonly<Record<string, WorkflowValidationReport>>;
  readonly testStateByNodeId: Readonly<Record<string, WorkflowTestState>>;
  readonly fullTestStateByTemplateId: Readonly<Record<string, WorkflowTestState>>;
  readonly triggerBindings: Readonly<Record<string, WorkflowTriggerBinding>>;
  readonly executeCommand: (
    templateId: string,
    command: WorkflowCommand,
  ) => WorkflowWorkspaceMutationResult;
  readonly updateMetadata: (
    templateId: string,
    input: { readonly name: string; readonly description: string },
  ) => WorkflowWorkspaceMutationResult;
  readonly createTemplate: (input: CreateWorkflowTemplateInput) => WorkflowTemplate;
  readonly selectTemplate: (templateId: string) => WorkflowWorkspaceMutationResult;
  readonly selectNode: (nodeId: string | null) => WorkflowWorkspaceMutationResult;
  readonly setViewport: (
    templateId: string,
    viewport: WorkflowViewport,
  ) => WorkflowWorkspaceMutationResult;
  readonly publish: (templateId: string) => WorkflowWorkspacePublishResult;
  readonly testNode: (nodeId: string) => WorkflowTestState | null;
  readonly testWorkflow: (templateId: string) => WorkflowTestState | null;
  readonly setTriggerBinding: (binding: WorkflowTriggerBinding) => WorkflowWorkspaceMutationResult;
  readonly undo: (templateId: string) => WorkflowWorkspaceMutationResult;
  readonly redo: (templateId: string) => WorkflowWorkspaceMutationResult;
}

export interface WorkflowViewport {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

export interface WorkflowTestState {
  readonly status: "idle" | "running" | "passed" | "failed";
  readonly message: string;
  readonly durationMs: number | null;
  readonly updatedAt: string | null;
}

export interface WorkflowTriggerBinding {
  readonly projectId: string;
  readonly templateId: string;
  readonly nodeId: string;
  readonly viewId: string | null;
}

export interface CreateWorkflowTemplateInput {
  readonly id?: string;
  readonly name: string;
  readonly description: string;
}

export interface WorkflowWorkspaceStoreOptions {
  readonly initialTemplates?: readonly WorkflowTemplate[];
  readonly now?: () => string;
  readonly storage?: StateStorage;
  readonly storageKey?: string;
}

export type WorkflowWorkspaceMutationResult =
  | { readonly ok: true; readonly changed: boolean }
  | { readonly ok: false; readonly changed: false; readonly reason: string };

export type WorkflowWorkspacePublishResult =
  | WorkflowPublishResult
  | {
      readonly ok: false;
      readonly template: null;
      readonly validation: WorkflowValidationReport;
      readonly reason: string;
    };

export function createWorkflowWorkspaceStore(options: WorkflowWorkspaceStoreOptions = {}) {
  const templates = structuredClone(options.initialTemplates ?? BASE_WORKFLOW_SEED_TEMPLATES);
  const now = options.now ?? (() => new Date().toISOString());
  return create<WorkflowWorkspaceStore>()(
    persist(
      (set, get) => ({
        templates,
        selectedTemplateId: templates[0]?.id ?? null,
        selectedNodeId: null,
        viewportByTemplateId: deriveViewportByTemplateId(templates),
        historyByTemplateId: deriveHistoryByTemplateId(templates),
        validationByTemplateId: deriveValidationByTemplateId(templates),
        testStateByNodeId: deriveTestStateByNodeId(templates),
        fullTestStateByTemplateId: deriveFullTestStateByTemplateId(templates),
        triggerBindings: {},
        executeCommand: (templateId, command) => {
          const state = get();
          const template = state.templates.find(({ id }) => id === templateId);
          if (!template) return missingTemplate(templateId);
          const history =
            state.historyByTemplateId[templateId] ?? createWorkflowHistory(template.draft);
          const result = applyWorkflowHistoryCommand(history, command);
          if (!result.accepted) {
            return { ok: false, changed: false, reason: result.reason };
          }
          if (!result.changed) return { ok: true, changed: false };
          commitHistory(set, state, template, result.history);
          return { ok: true, changed: true };
        },
        updateMetadata: (templateId, input) => {
          const state = get();
          const template = state.templates.find(({ id }) => id === templateId);
          if (!template) return missingTemplate(templateId);
          const name = input.name.trim();
          const description = input.description.trim();
          if (!name) {
            return { ok: false, changed: false, reason: "Workflow name is required." };
          }
          const history =
            state.historyByTemplateId[templateId] ?? createWorkflowHistory(template.draft);
          if (
            history.present.content.name === name &&
            history.present.content.description === description
          ) {
            return { ok: true, changed: false };
          }
          const nextHistory: WorkflowHistory = {
            past: [...history.past, history.present.content].slice(-100),
            present: {
              ...history.present,
              revision: history.present.revision + 1,
              content: { ...history.present.content, name, description },
            },
            future: [],
          };
          commitHistory(set, state, template, nextHistory);
          return { ok: true, changed: true };
        },
        createTemplate: (input) => {
          const state = get();
          const name = input.name.trim();
          const description = input.description.trim();
          if (!name) throw new Error("Workflow name is required.");
          const id = input.id?.trim() || createTemplateId(name, state.templates);
          if (state.templates.some((template) => template.id === id)) {
            throw new Error(`Workflow template ${id} already exists.`);
          }
          const triggerId = `${id}:trigger`;
          const draft = createWorkflowDraft(id, {
            name,
            description,
            graph: {
              nodes: [
                {
                  id: triggerId,
                  kind: "trigger",
                  name: "Manual trigger",
                  position: { x: 80, y: 160 },
                  disabled: false,
                  config: { event: "manual" },
                },
              ],
              edges: [],
            },
          });
          const template: WorkflowTemplate = {
            id,
            workspaceId: state.templates[0]?.workspaceId ?? "workspace-kiso-labs",
            draft,
            versions: [],
            archivedAt: null,
          };
          set({
            templates: [...state.templates, template],
            selectedTemplateId: id,
            selectedNodeId: null,
            viewportByTemplateId: {
              ...state.viewportByTemplateId,
              [id]: DEFAULT_WORKFLOW_VIEWPORT,
            },
            historyByTemplateId: {
              ...state.historyByTemplateId,
              [id]: createWorkflowHistory(draft),
            },
            validationByTemplateId: {
              ...state.validationByTemplateId,
              [id]: validateWorkflowDraft(draft),
            },
            testStateByNodeId: {
              ...state.testStateByNodeId,
              [triggerId]: IDLE_WORKFLOW_TEST_STATE,
            },
            fullTestStateByTemplateId: {
              ...state.fullTestStateByTemplateId,
              [id]: IDLE_WORKFLOW_TEST_STATE,
            },
          });
          return template;
        },
        selectTemplate: (templateId) => {
          const state = get();
          if (!state.templates.some(({ id }) => id === templateId)) {
            return missingTemplate(templateId);
          }
          if (state.selectedTemplateId === templateId) return { ok: true, changed: false };
          set({ selectedTemplateId: templateId, selectedNodeId: null });
          return { ok: true, changed: true };
        },
        selectNode: (nodeId) => {
          const state = get();
          if (nodeId === null) {
            if (state.selectedNodeId === null) return { ok: true, changed: false };
            set({ selectedNodeId: null });
            return { ok: true, changed: true };
          }
          const template = state.templates.find(({ id }) => id === state.selectedTemplateId);
          if (!template?.draft.content.graph.nodes.some(({ id }) => id === nodeId)) {
            return {
              ok: false,
              changed: false,
              reason: `Node ${nodeId} does not exist in the selected workflow.`,
            };
          }
          if (state.selectedNodeId === nodeId) return { ok: true, changed: false };
          set({ selectedNodeId: nodeId });
          return { ok: true, changed: true };
        },
        setViewport: (templateId, viewport) => {
          const state = get();
          if (!state.templates.some(({ id }) => id === templateId)) {
            return missingTemplate(templateId);
          }
          if (
            !Number.isFinite(viewport.x) ||
            !Number.isFinite(viewport.y) ||
            !Number.isFinite(viewport.zoom) ||
            viewport.zoom <= 0
          ) {
            return { ok: false, changed: false, reason: "Workflow viewport must be finite." };
          }
          const current = state.viewportByTemplateId[templateId];
          if (
            current?.x === viewport.x &&
            current.y === viewport.y &&
            current.zoom === viewport.zoom
          ) {
            return { ok: true, changed: false };
          }
          set({
            viewportByTemplateId: { ...state.viewportByTemplateId, [templateId]: viewport },
          });
          return { ok: true, changed: true };
        },
        publish: (templateId) => {
          const state = get();
          const template = state.templates.find(({ id }) => id === templateId);
          if (!template) {
            return {
              ok: false,
              template: null,
              validation: { diagnostics: [], canPublish: false },
              reason: `Workflow template ${templateId} does not exist.`,
            };
          }
          const nextVersion = (template.versions.at(-1)?.version ?? 0) + 1;
          const result = publishWorkflow(template, {
            publishedAt: now(),
            versionId: `${template.id}:v${nextVersion}`,
          });
          if (result.ok) {
            set({
              templates: replaceTemplate(state.templates, result.template),
              validationByTemplateId: {
                ...state.validationByTemplateId,
                [template.id]: result.validation,
              },
            });
          } else {
            set({
              validationByTemplateId: {
                ...state.validationByTemplateId,
                [template.id]: result.validation,
              },
            });
          }
          return result;
        },
        testNode: (nodeId) => {
          const state = get();
          const selectedTemplate = state.templates.find(
            ({ id }) => id === state.selectedTemplateId,
          );
          const template = selectedTemplate?.draft.content.graph.nodes.some(
            ({ id }) => id === nodeId,
          )
            ? selectedTemplate
            : state.templates.find(({ draft }) =>
                draft.content.graph.nodes.some(({ id }) => id === nodeId),
              );
          if (!template) return null;
          const validation = validateWorkflowDraft(template.draft);
          const diagnostics = validation.diagnostics.filter(
            (diagnostic) => diagnostic.nodeId === nodeId && diagnostic.severity === "error",
          );
          const nodeIndex = template.draft.content.graph.nodes.findIndex(({ id }) => id === nodeId);
          const testState: WorkflowTestState = diagnostics.length
            ? {
                status: "failed",
                message: diagnostics[0]!.message,
                durationMs: 420 + nodeIndex * 37,
                updatedAt: now(),
              }
            : {
                status: "passed",
                message: "Step configuration passed.",
                durationMs: 420 + nodeIndex * 37,
                updatedAt: now(),
              };
          set({
            testStateByNodeId: { ...state.testStateByNodeId, [nodeId]: testState },
            validationByTemplateId: {
              ...state.validationByTemplateId,
              [template.id]: validation,
            },
          });
          return testState;
        },
        testWorkflow: (templateId) => {
          const state = get();
          const template = state.templates.find(({ id }) => id === templateId);
          if (!template) return null;
          const validation = validateWorkflowDraft(template.draft);
          const blockingErrors = validation.diagnostics.filter(
            ({ severity }) => severity === "error",
          );
          const testState: WorkflowTestState = blockingErrors.length
            ? {
                status: "failed",
                message: `${blockingErrors.length} blocking validation error${blockingErrors.length === 1 ? "" : "s"}`,
                durationMs: 1_100 + template.draft.content.graph.nodes.length * 83,
                updatedAt: now(),
              }
            : {
                status: "passed",
                message: `${template.draft.content.graph.nodes.length} steps validated`,
                durationMs: 1_100 + template.draft.content.graph.nodes.length * 83,
                updatedAt: now(),
              };
          set({
            fullTestStateByTemplateId: {
              ...state.fullTestStateByTemplateId,
              [template.id]: testState,
            },
            validationByTemplateId: {
              ...state.validationByTemplateId,
              [template.id]: validation,
            },
          });
          return testState;
        },
        setTriggerBinding: (binding) => {
          const state = get();
          const template = state.templates.find(({ id }) => id === binding.templateId);
          const node = template?.draft.content.graph.nodes.find(({ id }) => id === binding.nodeId);
          if (!template || node?.kind !== "trigger") {
            return {
              ok: false,
              changed: false,
              reason: "Project view bindings require an existing trigger node.",
            };
          }
          const normalizedViewId = binding.viewId?.trim() || null;
          const key = workflowTriggerBindingKey(
            binding.projectId,
            binding.templateId,
            binding.nodeId,
          );
          const nextBinding = { ...binding, viewId: normalizedViewId };
          const current = state.triggerBindings[key];
          if (
            current?.projectId === nextBinding.projectId &&
            current.templateId === nextBinding.templateId &&
            current.nodeId === nextBinding.nodeId &&
            current.viewId === nextBinding.viewId
          ) {
            return { ok: true, changed: false };
          }
          set({ triggerBindings: { ...state.triggerBindings, [key]: nextBinding } });
          return { ok: true, changed: true };
        },
        undo: (templateId) => {
          const state = get();
          const template = state.templates.find(({ id }) => id === templateId);
          if (!template) return missingTemplate(templateId);
          const result = undoWorkflowHistory(
            state.historyByTemplateId[templateId] ?? createWorkflowHistory(template.draft),
          );
          if (!result.changed) return { ok: true, changed: false };
          commitHistory(set, state, template, result.history);
          return { ok: true, changed: true };
        },
        redo: (templateId) => {
          const state = get();
          const template = state.templates.find(({ id }) => id === templateId);
          if (!template) return missingTemplate(templateId);
          const result = redoWorkflowHistory(
            state.historyByTemplateId[templateId] ?? createWorkflowHistory(template.draft),
          );
          if (!result.changed) return { ok: true, changed: false };
          commitHistory(set, state, template, result.history);
          return { ok: true, changed: true };
        },
      }),
      {
        name: options.storageKey ?? "base:workflow-workspace:v2",
        version: 2,
        storage: createJSONStorage(
          () =>
            options.storage ??
            resolveStorage(typeof window !== "undefined" ? window.localStorage : undefined),
        ),
        partialize: (state) => ({
          templates: state.templates,
          selectedTemplateId: state.selectedTemplateId,
          viewportByTemplateId: state.viewportByTemplateId,
          triggerBindings: state.triggerBindings,
        }),
        merge: (persistedState, currentState) =>
          hydrateWorkflowWorkspaceState(
            currentState,
            persistedState as Partial<WorkflowWorkspaceStore>,
          ),
      },
    ),
  );
}

export const useWorkflowWorkspaceStore = createWorkflowWorkspaceStore();

export function workflowTriggerBindingKey(
  projectId: string,
  templateId: string,
  nodeId: string,
): string {
  return `${projectId}:${templateId}:${nodeId}`;
}

export function deriveWorkflowSummaries(
  templates: readonly WorkflowTemplate[],
): readonly BaseWorkflowSummary[] {
  return templates
    .filter(({ archivedAt }) => archivedAt === null)
    .map((template) => {
      const latestVersion = template.versions.at(-1);
      return {
        id: template.id,
        name: template.draft.content.name,
        description: template.draft.content.description,
        trigger: describeTrigger(
          template.draft.content.graph.nodes.find(
            (node): node is Extract<WorkflowNode, { readonly kind: "trigger" }> =>
              node.kind === "trigger" && !node.disabled,
          )?.config,
        ),
        status:
          latestVersion?.checksum === workflowContentChecksum(template.draft.content)
            ? "Published"
            : "Draft",
        version: latestVersion?.version ?? 0,
        successRate: WORKFLOW_SEED_SUCCESS_RATES[template.id] ?? null,
      } satisfies BaseWorkflowSummary;
    });
}

function deriveValidationByTemplateId(
  templates: readonly WorkflowTemplate[],
): Readonly<Record<string, WorkflowValidationReport>> {
  return Object.fromEntries(
    templates.map((template) => [template.id, validateWorkflowDraft(template.draft)]),
  );
}

function hydrateWorkflowWorkspaceState(
  currentState: WorkflowWorkspaceStore,
  persistedState: Partial<WorkflowWorkspaceStore>,
): WorkflowWorkspaceStore {
  const templates = isWorkflowTemplateArray(persistedState.templates)
    ? persistedState.templates
    : currentState.templates;
  const defaultViewports = deriveViewportByTemplateId(templates);
  const viewportByTemplateId = Object.fromEntries(
    templates.map(({ id }) => {
      const viewport = persistedState.viewportByTemplateId?.[id];
      return [id, isWorkflowViewport(viewport) ? viewport : defaultViewports[id]!];
    }),
  );
  const selectedTemplateId = templates.some(({ id }) => id === persistedState.selectedTemplateId)
    ? (persistedState.selectedTemplateId ?? null)
    : (templates[0]?.id ?? null);

  return {
    ...currentState,
    templates,
    selectedTemplateId,
    selectedNodeId: null,
    viewportByTemplateId,
    historyByTemplateId: deriveHistoryByTemplateId(templates),
    validationByTemplateId: deriveValidationByTemplateId(templates),
    testStateByNodeId: deriveTestStateByNodeId(templates),
    fullTestStateByTemplateId: deriveFullTestStateByTemplateId(templates),
    triggerBindings: isWorkflowTriggerBindingRecord(persistedState.triggerBindings)
      ? persistedState.triggerBindings
      : {},
  };
}

function isWorkflowTriggerBindingRecord(
  value: unknown,
): value is Readonly<Record<string, WorkflowTriggerBinding>> {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.values(value).every(
      (binding) =>
        typeof binding === "object" &&
        binding !== null &&
        "projectId" in binding &&
        typeof binding.projectId === "string" &&
        "templateId" in binding &&
        typeof binding.templateId === "string" &&
        "nodeId" in binding &&
        typeof binding.nodeId === "string" &&
        "viewId" in binding &&
        (binding.viewId === null || typeof binding.viewId === "string"),
    )
  );
}

function isWorkflowTemplateArray(value: unknown): value is readonly WorkflowTemplate[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (template) =>
        typeof template === "object" &&
        template !== null &&
        "id" in template &&
        typeof template.id === "string" &&
        "draft" in template &&
        typeof template.draft === "object" &&
        template.draft !== null,
    )
  );
}

function isWorkflowViewport(value: unknown): value is WorkflowViewport {
  return (
    typeof value === "object" &&
    value !== null &&
    "x" in value &&
    typeof value.x === "number" &&
    Number.isFinite(value.x) &&
    "y" in value &&
    typeof value.y === "number" &&
    Number.isFinite(value.y) &&
    "zoom" in value &&
    typeof value.zoom === "number" &&
    Number.isFinite(value.zoom) &&
    value.zoom > 0
  );
}

function deriveHistoryByTemplateId(
  templates: readonly WorkflowTemplate[],
): Readonly<Record<string, WorkflowHistory>> {
  return Object.fromEntries(
    templates.map((template) => [template.id, createWorkflowHistory(template.draft)]),
  );
}

function deriveViewportByTemplateId(
  templates: readonly WorkflowTemplate[],
): Readonly<Record<string, WorkflowViewport>> {
  return Object.fromEntries(templates.map((template) => [template.id, DEFAULT_WORKFLOW_VIEWPORT]));
}

function deriveTestStateByNodeId(
  templates: readonly WorkflowTemplate[],
): Readonly<Record<string, WorkflowTestState>> {
  return Object.fromEntries(
    templates.flatMap(({ draft }) =>
      draft.content.graph.nodes.map(({ id }) => [id, IDLE_WORKFLOW_TEST_STATE]),
    ),
  );
}

function deriveFullTestStateByTemplateId(
  templates: readonly WorkflowTemplate[],
): Readonly<Record<string, WorkflowTestState>> {
  return Object.fromEntries(templates.map(({ id }) => [id, IDLE_WORKFLOW_TEST_STATE]));
}

function commitHistory(
  set: (partial: Partial<WorkflowWorkspaceStore>) => void,
  state: WorkflowWorkspaceStore,
  template: WorkflowTemplate,
  history: WorkflowHistory,
): void {
  const updatedTemplate = { ...template, draft: history.present };
  set({
    templates: replaceTemplate(state.templates, updatedTemplate),
    historyByTemplateId: { ...state.historyByTemplateId, [template.id]: history },
    validationByTemplateId: {
      ...state.validationByTemplateId,
      [template.id]: validateWorkflowDraft(history.present),
    },
    testStateByNodeId: resetTemplateNodeTests(state.testStateByNodeId, template, updatedTemplate),
    fullTestStateByTemplateId: {
      ...state.fullTestStateByTemplateId,
      [template.id]: IDLE_WORKFLOW_TEST_STATE,
    },
    selectedNodeId:
      state.selectedTemplateId === template.id &&
      state.selectedNodeId !== null &&
      !updatedTemplate.draft.content.graph.nodes.some(({ id }) => id === state.selectedNodeId)
        ? null
        : state.selectedNodeId,
  });
}

function resetTemplateNodeTests(
  current: Readonly<Record<string, WorkflowTestState>>,
  previousTemplate: WorkflowTemplate,
  updatedTemplate: WorkflowTemplate,
): Readonly<Record<string, WorkflowTestState>> {
  const previousNodeIds = new Set(previousTemplate.draft.content.graph.nodes.map(({ id }) => id));
  const next = Object.fromEntries(
    Object.entries(current).filter(([nodeId]) => !previousNodeIds.has(nodeId)),
  );
  for (const { id } of updatedTemplate.draft.content.graph.nodes) {
    next[id] = IDLE_WORKFLOW_TEST_STATE;
  }
  return next;
}

function replaceTemplate(
  templates: readonly WorkflowTemplate[],
  updatedTemplate: WorkflowTemplate,
): readonly WorkflowTemplate[] {
  return templates.map((template) =>
    template.id === updatedTemplate.id ? updatedTemplate : template,
  );
}

function missingTemplate(templateId: string): WorkflowWorkspaceMutationResult {
  return {
    ok: false,
    changed: false,
    reason: `Workflow template ${templateId} does not exist.`,
  };
}

function createTemplateId(name: string, templates: readonly WorkflowTemplate[]): string {
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "workflow";
  const baseId = `workflow-${slug}`;
  if (!templates.some(({ id }) => id === baseId)) return baseId;
  let suffix = 2;
  while (templates.some(({ id }) => id === `${baseId}-${suffix}`)) suffix += 1;
  return `${baseId}-${suffix}`;
}

function describeTrigger(trigger: WorkflowTriggerConfig | undefined): string {
  if (!trigger) return "No trigger";
  switch (trigger.event) {
    case "manual":
      return "Manual run";
    case "issue-status":
      return `Issue enters ${trigger.status}`;
    case "issue-queued":
      return "Issue queued";
    case "repository":
      return trigger.action === "push" ? "Push attempted" : "Pull request opened";
    case "schedule":
      return `Schedule · ${trigger.cron}`;
    case "webhook":
      return `Webhook · ${trigger.path}`;
  }
}

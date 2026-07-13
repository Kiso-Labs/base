import type { BaseIssueStatus } from "./workspaceRepository";

export interface WorkflowPosition {
  readonly x: number;
  readonly y: number;
}

export interface WorkflowRetryPolicy {
  readonly maxRetries: number;
  readonly strategy: "fixed" | "exponential";
  readonly delaySeconds: number;
  readonly maxDelaySeconds: number;
}

export type WorkflowTriggerConfig =
  | { readonly event: "manual" }
  | { readonly event: "issue-status"; readonly status: BaseIssueStatus }
  | { readonly event: "issue-queued" }
  | {
      readonly event: "repository";
      readonly action: "push" | "pull-request";
    }
  | {
      readonly event: "schedule";
      readonly cron: string;
      readonly timezone: string;
    }
  | { readonly event: "webhook"; readonly path: string };

interface WorkflowNodeBase<Kind extends string, Config> {
  readonly id: string;
  readonly kind: Kind;
  readonly name: string;
  readonly position: WorkflowPosition;
  readonly disabled: boolean;
  readonly config: Config;
}

export type WorkflowNode =
  | WorkflowNodeBase<"trigger", WorkflowTriggerConfig>
  | WorkflowNodeBase<
      "agent",
      {
        readonly agentProfileId: string;
        readonly prompt: string;
        readonly workingDirectory: string;
        readonly tools: readonly string[];
        readonly timeoutSeconds: number;
        readonly retry: WorkflowRetryPolicy;
      }
    >
  | WorkflowNodeBase<
      "test",
      {
        readonly command: string;
        readonly workingDirectory: string;
        readonly timeoutSeconds: number;
        readonly retry: WorkflowRetryPolicy;
      }
    >
  | WorkflowNodeBase<
      "hook",
      {
        readonly hook: "pre-commit" | "pre-push" | "post-run" | "custom";
        readonly command: string;
        readonly timeoutSeconds: number;
        readonly retry: WorkflowRetryPolicy;
      }
    >
  | WorkflowNodeBase<
      "approval",
      {
        readonly instructions: string;
        readonly approverGroup: string;
        readonly timeoutMinutes: number | null;
        readonly timeoutOutcome: "reject" | "fail";
      }
    >
  | WorkflowNodeBase<
      "branch",
      {
        readonly cases: readonly {
          readonly id: string;
          readonly label: string;
          readonly expression: string;
        }[];
      }
    >;

interface WorkflowEdgeBase {
  readonly id: string;
  readonly sourceNodeId: string;
  readonly targetNodeId: string;
  readonly label?: string;
}

export type WorkflowEdge =
  | (WorkflowEdgeBase & { readonly kind: "success" })
  | (WorkflowEdgeBase & { readonly kind: "failure" })
  | (WorkflowEdgeBase & {
      readonly kind: "approval";
      readonly outcome: "approved" | "rejected" | "timed-out";
    })
  | (WorkflowEdgeBase & {
      readonly kind: "branch";
      readonly caseId: string | null;
    });

export interface WorkflowGraph {
  readonly nodes: readonly WorkflowNode[];
  readonly edges: readonly WorkflowEdge[];
}

export interface WorkflowDraftContent {
  readonly name: string;
  readonly description: string;
  readonly graph: WorkflowGraph;
}

export interface WorkflowDraft {
  readonly templateId: string;
  readonly revision: number;
  readonly content: WorkflowDraftContent;
}

export type WorkflowValidationCode =
  | "duplicate-node-id"
  | "duplicate-edge-id"
  | "missing-trigger"
  | "trigger-incoming-edge"
  | "dangling-edge"
  | "self-edge"
  | "invalid-edge-outcome"
  | "edge-output-duplicate"
  | "graph-cycle"
  | "unreachable-node"
  | "trigger-config-invalid"
  | "agent-config-invalid"
  | "test-config-invalid"
  | "hook-config-invalid"
  | "approval-config-invalid"
  | "branch-config-invalid"
  | "branch-case-edge-missing"
  | "branch-case-edge-duplicate"
  | "branch-default-edge-missing"
  | "branch-default-edge-duplicate"
  | "retry-policy-invalid"
  | "unknown-agent-profile";

export interface WorkflowDiagnostic {
  readonly severity: "error" | "warning";
  readonly code: WorkflowValidationCode;
  readonly message: string;
  readonly nodeId?: string;
  readonly edgeId?: string;
}

export interface WorkflowValidationReferences {
  readonly agentProfileIds?: readonly string[];
}

export interface WorkflowValidationReport {
  readonly diagnostics: readonly WorkflowDiagnostic[];
  readonly canPublish: boolean;
}

export type WorkflowAtomicCommand =
  | { readonly type: "node.add"; readonly node: WorkflowNode }
  | { readonly type: "node.update"; readonly node: WorkflowNode }
  | {
      readonly type: "nodes.move";
      readonly positions: Readonly<Record<string, WorkflowPosition>>;
    }
  | { readonly type: "nodes.remove"; readonly nodeIds: readonly string[] }
  | { readonly type: "edge.connect"; readonly edge: WorkflowEdge }
  | { readonly type: "edges.remove"; readonly edgeIds: readonly string[] };

export type WorkflowCommand =
  | WorkflowAtomicCommand
  | { readonly type: "batch"; readonly commands: readonly WorkflowAtomicCommand[] };

export type WorkflowMutationResult =
  | {
      readonly accepted: true;
      readonly changed: boolean;
      readonly draft: WorkflowDraft;
    }
  | {
      readonly accepted: false;
      readonly changed: false;
      readonly draft: WorkflowDraft;
      readonly reason: string;
    };

export interface WorkflowHistory {
  readonly past: readonly WorkflowDraftContent[];
  readonly present: WorkflowDraft;
  readonly future: readonly WorkflowDraftContent[];
}

export type WorkflowHistoryMutationResult =
  | {
      readonly accepted: true;
      readonly changed: boolean;
      readonly history: WorkflowHistory;
    }
  | {
      readonly accepted: false;
      readonly changed: false;
      readonly history: WorkflowHistory;
      readonly reason: string;
    };

export interface WorkflowHistoryNavigationResult {
  readonly changed: boolean;
  readonly history: WorkflowHistory;
}

export interface WorkflowVersion {
  readonly id: string;
  readonly templateId: string;
  readonly version: number;
  readonly content: WorkflowDraftContent;
  readonly publishedAt: string;
  readonly checksum: string;
}

export interface WorkflowTemplate {
  readonly id: string;
  readonly workspaceId: string;
  readonly draft: WorkflowDraft;
  readonly versions: readonly WorkflowVersion[];
  readonly archivedAt: string | null;
}

export interface WorkflowPublishOptions {
  readonly publishedAt: string;
  readonly versionId?: string;
  readonly references?: WorkflowValidationReferences;
}

export type WorkflowPublishResult =
  | {
      readonly ok: true;
      readonly template: WorkflowTemplate;
      readonly version: WorkflowVersion;
      readonly validation: WorkflowValidationReport;
    }
  | {
      readonly ok: false;
      readonly template: WorkflowTemplate;
      readonly validation: WorkflowValidationReport;
      readonly reason: string;
    };

export function createWorkflowDraft(
  templateId: string,
  content: WorkflowDraftContent,
): WorkflowDraft {
  return { templateId, revision: 0, content };
}

export function createWorkflowHistory(draft: WorkflowDraft): WorkflowHistory {
  return { past: [], present: draft, future: [] };
}

export function applyWorkflowHistoryCommand(
  history: WorkflowHistory,
  command: WorkflowCommand,
  historyLimit = 100,
): WorkflowHistoryMutationResult {
  const result = applyWorkflowCommand(history.present, command);
  if (!result.accepted) {
    return { accepted: false, changed: false, history, reason: result.reason };
  }
  if (!result.changed) return { accepted: true, changed: false, history };
  const limit = Math.max(1, Math.floor(historyLimit));
  return {
    accepted: true,
    changed: true,
    history: {
      past: [...history.past, history.present.content].slice(-limit),
      present: result.draft,
      future: [],
    },
  };
}

export function undoWorkflowHistory(history: WorkflowHistory): WorkflowHistoryNavigationResult {
  const previous = history.past.at(-1);
  if (!previous) return { changed: false, history };
  return {
    changed: true,
    history: {
      past: history.past.slice(0, -1),
      present: {
        ...history.present,
        revision: history.present.revision + 1,
        content: previous,
      },
      future: [history.present.content, ...history.future],
    },
  };
}

export function redoWorkflowHistory(history: WorkflowHistory): WorkflowHistoryNavigationResult {
  const [next, ...future] = history.future;
  if (!next) return { changed: false, history };
  return {
    changed: true,
    history: {
      past: [...history.past, history.present.content],
      present: {
        ...history.present,
        revision: history.present.revision + 1,
        content: next,
      },
      future,
    },
  };
}

export function publishWorkflow(
  template: WorkflowTemplate,
  options: WorkflowPublishOptions,
): WorkflowPublishResult {
  const validation = validateWorkflowDraft(template.draft, options.references);
  if (template.archivedAt) {
    return { ok: false, template, validation, reason: "Archived workflows cannot be published." };
  }
  if (!validation.canPublish) {
    return {
      ok: false,
      template,
      validation,
      reason: "Resolve workflow validation errors before publishing.",
    };
  }

  const checksum = workflowContentChecksum(template.draft.content);
  if (template.versions.at(-1)?.checksum === checksum) {
    return {
      ok: false,
      template,
      validation,
      reason: "The draft matches the latest published version.",
    };
  }

  const versionNumber = (template.versions.at(-1)?.version ?? 0) + 1;
  const version: WorkflowVersion = {
    id: options.versionId ?? `${template.id}-v${versionNumber}`,
    templateId: template.id,
    version: versionNumber,
    content: cloneWorkflowContent(template.draft.content),
    publishedAt: options.publishedAt,
    checksum,
  };
  return {
    ok: true,
    version,
    validation,
    template: { ...template, versions: [...template.versions, version] },
  };
}

export function workflowContentChecksum(content: WorkflowDraftContent): string {
  const canonicalContent = {
    ...content,
    graph: {
      nodes: [...content.graph.nodes].sort(compareById),
      edges: [...content.graph.edges].sort(compareById),
    },
  };
  const serialized = JSON.stringify(sortObjectKeys(canonicalContent));
  let hash = 0x811c9dc5;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function compareById(left: { readonly id: string }, right: { readonly id: string }): number {
  return left.id.localeCompare(right.id);
}

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObjectKeys);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nestedValue]) => [key, sortObjectKeys(nestedValue)]),
  );
}

function cloneWorkflowContent(content: WorkflowDraftContent): WorkflowDraftContent {
  return structuredClone(content);
}

export function validateWorkflowDraft(
  draft: WorkflowDraft,
  references: WorkflowValidationReferences = {},
): WorkflowValidationReport {
  const { nodes, edges } = draft.content.graph;
  const diagnostics: WorkflowDiagnostic[] = [];
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const connectedOutputs = new Set<string>();

  collectDuplicateIdDiagnostics(nodes, "node", diagnostics);
  collectDuplicateIdDiagnostics(edges, "edge", diagnostics);
  for (const node of nodes) {
    if (!node.disabled) collectNodeConfigurationDiagnostics(node, references, diagnostics);
  }

  for (const edge of edges) {
    const source = nodesById.get(edge.sourceNodeId);
    const target = nodesById.get(edge.targetNodeId);
    if (!source || !target) {
      diagnostics.push({
        severity: "error",
        code: "dangling-edge",
        message: `Edge ${edge.id} must connect two existing nodes.`,
        edgeId: edge.id,
      });
      continue;
    }
    if (source.id === target.id) {
      diagnostics.push({
        severity: "error",
        code: "self-edge",
        message: "An edge cannot connect a node to itself.",
        nodeId: source.id,
        edgeId: edge.id,
      });
    }
    if (!isLegalOutcome(source, edge)) {
      diagnostics.push({
        severity: "error",
        code: "invalid-edge-outcome",
        message: `${edge.kind} is not a valid outcome for ${source.kind}.`,
        nodeId: source.id,
        edgeId: edge.id,
      });
    }
    const outputKey = `${source.id}:${workflowEdgeOutputKey(edge)}`;
    if (connectedOutputs.has(outputKey)) {
      diagnostics.push({
        severity: "error",
        code: "edge-output-duplicate",
        message: `The ${describeWorkflowEdgeOutput(edge)} output can have only one connection.`,
        nodeId: source.id,
        edgeId: edge.id,
      });
    } else {
      connectedOutputs.add(outputKey);
    }
    if (target?.kind === "trigger") {
      diagnostics.push({
        severity: "error",
        code: "trigger-incoming-edge",
        message: "Trigger nodes cannot have incoming edges.",
        nodeId: target.id,
        edgeId: edge.id,
      });
    }
  }

  const enabledTriggers = nodes.filter(
    (node): node is Extract<WorkflowNode, { readonly kind: "trigger" }> =>
      node.kind === "trigger" && !node.disabled,
  );
  if (enabledTriggers.length === 0) {
    diagnostics.push({
      severity: "error",
      code: "missing-trigger",
      message: "A workflow requires at least one enabled trigger.",
    });
  }

  for (const node of nodes) {
    if (node.kind !== "branch" || node.disabled) continue;
    const branchEdges = edges.filter(
      (edge): edge is Extract<WorkflowEdge, { readonly kind: "branch" }> =>
        edge.sourceNodeId === node.id && edge.kind === "branch",
    );
    for (const branchCase of node.config.cases) {
      const count = branchEdges.filter(({ caseId }) => caseId === branchCase.id).length;
      if (count === 0) {
        diagnostics.push({
          severity: "error",
          code: "branch-case-edge-missing",
          message: `${branchCase.label || branchCase.id} needs an outgoing branch edge.`,
          nodeId: node.id,
        });
      } else if (count > 1) {
        diagnostics.push({
          severity: "error",
          code: "branch-case-edge-duplicate",
          message: `${branchCase.label || branchCase.id} has more than one outgoing edge.`,
          nodeId: node.id,
        });
      }
    }
    const defaultCount = branchEdges.filter(({ caseId }) => caseId === null).length;
    if (defaultCount === 0) {
      diagnostics.push({
        severity: "error",
        code: "branch-default-edge-missing",
        message: "A branch requires one default outcome.",
        nodeId: node.id,
      });
    } else if (defaultCount > 1) {
      diagnostics.push({
        severity: "error",
        code: "branch-default-edge-duplicate",
        message: "A branch can have only one default outcome.",
        nodeId: node.id,
      });
    }
  }

  const adjacency = createAdjacency(nodes, edges);
  if (containsCycle(nodes, adjacency)) {
    diagnostics.push({
      severity: "error",
      code: "graph-cycle",
      message: "Workflow control flow must be acyclic; configure bounded retries on steps instead.",
    });
  }

  const reachable = collectReachableNodeIds(
    enabledTriggers.map(({ id }) => id),
    adjacency,
  );
  for (const node of nodes) {
    if (node.disabled || node.kind === "trigger" || reachable.has(node.id)) continue;
    diagnostics.push({
      severity: "error",
      code: "unreachable-node",
      message: `${node.name || node.id} is not reachable from an enabled trigger.`,
      nodeId: node.id,
    });
  }

  return {
    diagnostics,
    canPublish: diagnostics.every(({ severity }) => severity !== "error"),
  };
}

function collectDuplicateIdDiagnostics(
  values: readonly { readonly id: string }[],
  kind: "node" | "edge",
  diagnostics: WorkflowDiagnostic[],
): void {
  const seen = new Set<string>();
  for (const { id } of values) {
    if (!seen.has(id)) {
      seen.add(id);
      continue;
    }
    diagnostics.push({
      severity: "error",
      code: kind === "node" ? "duplicate-node-id" : "duplicate-edge-id",
      message: `${kind === "node" ? "Node" : "Edge"} IDs must be unique; ${id} is duplicated.`,
      ...(kind === "node" ? { nodeId: id } : { edgeId: id }),
    });
  }
}

function collectNodeConfigurationDiagnostics(
  node: WorkflowNode,
  references: WorkflowValidationReferences,
  diagnostics: WorkflowDiagnostic[],
): void {
  const invalid = (code: WorkflowValidationCode, message: string) =>
    diagnostics.push({ severity: "error", code, message, nodeId: node.id });
  switch (node.kind) {
    case "trigger":
      if (
        (node.config.event === "schedule" &&
          (!node.config.cron.trim() || !node.config.timezone.trim())) ||
        (node.config.event === "webhook" && !node.config.path.trim())
      ) {
        invalid("trigger-config-invalid", "Complete the trigger configuration before publishing.");
      }
      return;
    case "agent":
      if (
        !node.config.agentProfileId.trim() ||
        !node.config.prompt.trim() ||
        !isPositiveFinite(node.config.timeoutSeconds)
      ) {
        invalid("agent-config-invalid", "Agent steps require a profile, prompt, and timeout.");
      }
      collectRetryDiagnostic(node.id, node.config.retry, diagnostics);
      if (
        references.agentProfileIds &&
        !references.agentProfileIds.includes(node.config.agentProfileId)
      ) {
        invalid("unknown-agent-profile", "The selected agent profile no longer exists.");
      }
      return;
    case "test":
      if (!node.config.command.trim() || !isPositiveFinite(node.config.timeoutSeconds)) {
        invalid("test-config-invalid", "Test steps require a command and timeout.");
      }
      collectRetryDiagnostic(node.id, node.config.retry, diagnostics);
      return;
    case "hook":
      if (!node.config.command.trim() || !isPositiveFinite(node.config.timeoutSeconds)) {
        invalid("hook-config-invalid", "Hooks require a command and timeout.");
      }
      collectRetryDiagnostic(node.id, node.config.retry, diagnostics);
      return;
    case "approval":
      if (
        !node.config.instructions.trim() ||
        !node.config.approverGroup.trim() ||
        (node.config.timeoutMinutes !== null && !isPositiveFinite(node.config.timeoutMinutes))
      ) {
        invalid("approval-config-invalid", "Approvals require instructions and an approver group.");
      }
      return;
    case "branch": {
      const caseIds = new Set<string>();
      const caseLabels = new Set<string>();
      const invalidCases =
        node.config.cases.length === 0 ||
        node.config.cases.some((branchCase) => {
          const normalizedLabel = branchCase.label.trim().toLocaleLowerCase();
          const duplicate = caseIds.has(branchCase.id) || caseLabels.has(normalizedLabel);
          caseIds.add(branchCase.id);
          caseLabels.add(normalizedLabel);
          return (
            duplicate ||
            !branchCase.id.trim() ||
            !branchCase.label.trim() ||
            !branchCase.expression.trim()
          );
        });
      if (invalidCases) {
        invalid("branch-config-invalid", "Branches require unique, labeled conditional cases.");
      }
    }
  }
}

function collectRetryDiagnostic(
  nodeId: string,
  retry: WorkflowRetryPolicy,
  diagnostics: WorkflowDiagnostic[],
): void {
  if (
    !Number.isInteger(retry.maxRetries) ||
    retry.maxRetries < 0 ||
    retry.maxRetries > 10 ||
    !isPositiveFinite(retry.delaySeconds) ||
    !isPositiveFinite(retry.maxDelaySeconds) ||
    retry.maxDelaySeconds < retry.delaySeconds
  ) {
    diagnostics.push({
      severity: "error",
      code: "retry-policy-invalid",
      message: "Retries must be bounded with positive delay values.",
      nodeId,
    });
  }
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function createAdjacency(
  nodes: readonly WorkflowNode[],
  edges: readonly WorkflowEdge[],
): ReadonlyMap<string, readonly string[]> {
  const adjacency = new Map(nodes.map(({ id }) => [id, [] as string[]]));
  for (const { sourceNodeId, targetNodeId } of edges) {
    if (!adjacency.has(targetNodeId)) continue;
    adjacency.get(sourceNodeId)?.push(targetNodeId);
  }
  return adjacency;
}

function containsCycle(
  nodes: readonly WorkflowNode[],
  adjacency: ReadonlyMap<string, readonly string[]>,
): boolean {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (nodeId: string): boolean => {
    if (visiting.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;
    visiting.add(nodeId);
    for (const targetNodeId of adjacency.get(nodeId) ?? []) {
      if (visit(targetNodeId)) return true;
    }
    visiting.delete(nodeId);
    visited.add(nodeId);
    return false;
  };
  return nodes.some(({ id }) => visit(id));
}

function collectReachableNodeIds(
  startNodeIds: readonly string[],
  adjacency: ReadonlyMap<string, readonly string[]>,
): ReadonlySet<string> {
  const reachable = new Set(startNodeIds);
  const pending = [...startNodeIds];
  for (let index = 0; index < pending.length; index += 1) {
    for (const targetNodeId of adjacency.get(pending[index]!) ?? []) {
      if (reachable.has(targetNodeId)) continue;
      reachable.add(targetNodeId);
      pending.push(targetNodeId);
    }
  }
  return reachable;
}

export function applyWorkflowCommand(
  draft: WorkflowDraft,
  command: WorkflowCommand,
): WorkflowMutationResult {
  if (command.type === "batch") {
    let current = draft;
    let changed = false;
    for (const nestedCommand of command.commands) {
      const result = applyWorkflowCommand(current, nestedCommand);
      if (!result.accepted) return rejectMutation(draft, result.reason);
      current = result.draft;
      changed ||= result.changed;
    }
    if (!changed) return unchangedMutation(draft);
    return {
      accepted: true,
      changed: true,
      draft: { ...current, revision: draft.revision + 1 },
    };
  }
  const { graph } = draft.content;
  switch (command.type) {
    case "node.add": {
      if (graph.nodes.some(({ id }) => id === command.node.id)) {
        return rejectMutation(draft, `Node ${command.node.id} already exists.`);
      }
      return acceptGraphMutation(draft, {
        ...graph,
        nodes: [...graph.nodes, command.node],
      });
    }
    case "node.update": {
      const nodeIndex = graph.nodes.findIndex(({ id }) => id === command.node.id);
      if (nodeIndex === -1) {
        return rejectMutation(draft, `Node ${command.node.id} does not exist.`);
      }
      const currentNode = graph.nodes[nodeIndex]!;
      if (currentNode.kind !== command.node.kind) {
        return rejectMutation(draft, "A node kind cannot be changed in place.");
      }
      if (sameValue(currentNode, command.node)) return unchangedMutation(draft);
      const nodes = [...graph.nodes];
      nodes[nodeIndex] = command.node;
      return acceptGraphMutation(draft, { ...graph, nodes });
    }
    case "nodes.move": {
      const entries = Object.entries(command.positions);
      const missingNodeId = entries.find(
        ([nodeId]) => !graph.nodes.some(({ id }) => id === nodeId),
      )?.[0];
      if (missingNodeId) {
        return rejectMutation(draft, `Node ${missingNodeId} does not exist.`);
      }
      if (
        entries.some(([, position]) => !Number.isFinite(position.x) || !Number.isFinite(position.y))
      ) {
        return rejectMutation(draft, "Node positions must contain finite coordinates.");
      }
      if (entries.length === 0) return unchangedMutation(draft);
      let changed = false;
      const nodes = graph.nodes.map((node) => {
        const position = command.positions[node.id];
        if (!position || sameValue(node.position, position)) return node;
        changed = true;
        return { ...node, position } as WorkflowNode;
      });
      return changed ? acceptGraphMutation(draft, { ...graph, nodes }) : unchangedMutation(draft);
    }
    case "nodes.remove": {
      const nodeIds = new Set(command.nodeIds);
      const missingNodeId = command.nodeIds.find(
        (nodeId) => !graph.nodes.some(({ id }) => id === nodeId),
      );
      if (missingNodeId) {
        return rejectMutation(draft, `Node ${missingNodeId} does not exist.`);
      }
      if (nodeIds.size === 0) return unchangedMutation(draft);
      return acceptGraphMutation(draft, {
        nodes: graph.nodes.filter(({ id }) => !nodeIds.has(id)),
        edges: graph.edges.filter(
          ({ sourceNodeId, targetNodeId }) =>
            !nodeIds.has(sourceNodeId) && !nodeIds.has(targetNodeId),
        ),
      });
    }
    case "edge.connect": {
      const { edge } = command;
      if (graph.edges.some(({ id }) => id === edge.id)) {
        return rejectMutation(draft, `Edge ${edge.id} already exists.`);
      }
      const source = graph.nodes.find(({ id }) => id === edge.sourceNodeId);
      if (!source) {
        return rejectMutation(draft, `Source node ${edge.sourceNodeId} does not exist.`);
      }
      const target = graph.nodes.find(({ id }) => id === edge.targetNodeId);
      if (!target) {
        return rejectMutation(draft, `Target node ${edge.targetNodeId} does not exist.`);
      }
      if (edge.sourceNodeId === edge.targetNodeId) {
        return rejectMutation(draft, "An edge cannot connect a node to itself.");
      }
      if (!isLegalOutcome(source, edge)) {
        return rejectMutation(draft, `${edge.kind} is not a valid outcome for ${source.kind}.`);
      }
      if (target.kind === "trigger") {
        return rejectMutation(draft, "Trigger nodes cannot have incoming edges.");
      }
      const outputKey = workflowEdgeOutputKey(edge);
      if (
        graph.edges.some(
          (candidate) =>
            candidate.sourceNodeId === edge.sourceNodeId &&
            workflowEdgeOutputKey(candidate) === outputKey,
        )
      ) {
        return rejectMutation(
          draft,
          `The ${describeWorkflowEdgeOutput(edge)} output is already connected.`,
        );
      }
      const nextGraph = { ...graph, edges: [...graph.edges, edge] };
      if (containsCycle(nextGraph.nodes, createAdjacency(nextGraph.nodes, nextGraph.edges))) {
        return rejectMutation(draft, "Workflow connections cannot create a cycle.");
      }
      return acceptGraphMutation(draft, nextGraph);
    }
    case "edges.remove": {
      const edgeIds = new Set(command.edgeIds);
      const missingEdgeId = command.edgeIds.find(
        (edgeId) => !graph.edges.some(({ id }) => id === edgeId),
      );
      if (missingEdgeId) {
        return rejectMutation(draft, `Edge ${missingEdgeId} does not exist.`);
      }
      if (edgeIds.size === 0) return unchangedMutation(draft);
      return acceptGraphMutation(draft, {
        ...graph,
        edges: graph.edges.filter(({ id }) => !edgeIds.has(id)),
      });
    }
  }
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(sortObjectKeys(left)) === JSON.stringify(sortObjectKeys(right));
}

function isLegalOutcome(source: WorkflowNode, edge: WorkflowEdge): boolean {
  if (source.kind === "trigger") return edge.kind === "success";
  if (source.kind === "agent" || source.kind === "test" || source.kind === "hook") {
    return edge.kind === "success" || edge.kind === "failure";
  }
  if (source.kind === "approval") return edge.kind === "approval";
  if (edge.kind !== "branch") return false;
  return edge.caseId === null || source.config.cases.some(({ id }) => id === edge.caseId);
}

function workflowEdgeOutputKey(edge: WorkflowEdge): string {
  if (edge.kind === "approval") return `${edge.kind}:${edge.outcome}`;
  if (edge.kind === "branch") return `${edge.kind}:${edge.caseId ?? "default"}`;
  return edge.kind;
}

function describeWorkflowEdgeOutput(edge: WorkflowEdge): string {
  if (edge.kind === "approval") return edge.outcome;
  if (edge.kind === "branch") return edge.caseId ?? "default";
  return edge.kind;
}

function acceptGraphMutation(draft: WorkflowDraft, graph: WorkflowGraph): WorkflowMutationResult {
  return {
    accepted: true,
    changed: true,
    draft: {
      ...draft,
      revision: draft.revision + 1,
      content: { ...draft.content, graph },
    },
  };
}

function unchangedMutation(draft: WorkflowDraft): WorkflowMutationResult {
  return { accepted: true, changed: false, draft };
}

function rejectMutation(draft: WorkflowDraft, reason: string): WorkflowMutationResult {
  return { accepted: false, changed: false, draft, reason };
}

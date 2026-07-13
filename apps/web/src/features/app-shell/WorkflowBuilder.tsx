import "@xyflow/react/dist/style.css";

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type OnConnect,
  type OnEdgesDelete,
  type OnNodesDelete,
} from "@xyflow/react";
import {
  AlertTriangleIcon,
  BotIcon,
  BoxesIcon,
  BracesIcon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleDotIcon,
  FlaskConicalIcon,
  GitBranchIcon,
  HandIcon,
  LayoutTemplateIcon,
  Maximize2Icon,
  PanelRightIcon,
  PlayIcon,
  PlusIcon,
  Redo2Icon,
  RocketIcon,
  SearchIcon,
  Settings2Icon,
  ShieldCheckIcon,
  SparklesIcon,
  Undo2Icon,
  WebhookIcon,
  ZapIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Kbd } from "~/components/ui/kbd";
import { toastManager } from "~/components/ui/toast";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";

import { BasePageShell } from "./BasePageShell";
import { useBaseWorkspace } from "./BaseWorkspaceContext";
import { WorkflowInspector } from "./WorkflowInspector";
import { useIssueWorkspaceStore } from "./issueWorkspaceStore";
import { workflowEdgeTypes, type WorkflowCanvasEdgeElement } from "./WorkflowCanvasEdge";
import {
  workflowNodeTypes,
  type WorkflowCanvasNodeElement,
  type WorkflowNodeTestState,
} from "./WorkflowCanvasNode";
import {
  createWorkflowCanvasElements,
  workflowConnectionToEdge,
  workflowNodePositionsCommand,
} from "./workflowCanvasAdapter";
import type { WorkflowCommand, WorkflowNode, WorkflowTemplate } from "./workflowGraph";
import {
  WORKFLOW_NODE_DEFINITIONS,
  createWorkflowNode,
  workflowNodeOutputs,
  type WorkflowNodeDefinition,
} from "./workflowNodeCatalog";
import {
  deriveWorkflowSummaries,
  useWorkflowWorkspaceStore,
  workflowTriggerBindingKey,
  type WorkflowTestState,
} from "./workflowWorkspaceStore";

const NODE_KIND_ICON = {
  trigger: ZapIcon,
  agent: BotIcon,
  test: FlaskConicalIcon,
  hook: WebhookIcon,
  approval: ShieldCheckIcon,
  branch: GitBranchIcon,
} as const;

const NODE_KIND_ACCENT = {
  trigger: "text-amber-600 bg-amber-500/10",
  agent: "text-violet-600 bg-violet-500/10",
  test: "text-emerald-600 bg-emerald-500/10",
  hook: "text-cyan-600 bg-cyan-500/10",
  approval: "text-orange-600 bg-orange-500/10",
  branch: "text-blue-600 bg-blue-500/10",
} as const;

function testStateForCanvas(state: WorkflowTestState | undefined): WorkflowNodeTestState {
  if (!state || state.status === "idle") return "idle";
  if (state.status === "running") return "running";
  return state.status === "passed" ? "succeeded" : "failed";
}

function TemplateRail({
  collapsed,
  onAddNode,
  onCreateTemplate,
  onToggleCollapsed,
  selectedTemplate,
}: {
  readonly collapsed: boolean;
  readonly onAddNode: (kind: WorkflowNode["kind"]) => void;
  readonly onCreateTemplate: () => void;
  readonly onToggleCollapsed: () => void;
  readonly selectedTemplate: WorkflowTemplate;
}) {
  const templates = useWorkflowWorkspaceStore((state) => state.templates);
  const selectTemplate = useWorkflowWorkspaceStore((state) => state.selectTemplate);
  const [query, setQuery] = useState("");
  const summaries = deriveWorkflowSummaries(templates);
  const matchingDefinitions = WORKFLOW_NODE_DEFINITIONS.filter((definition) =>
    `${definition.label} ${definition.description} ${definition.group}`
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase()),
  );

  if (collapsed) {
    return (
      <aside className="flex h-full w-11 shrink-0 flex-col items-center gap-1 border-r border-border/65 bg-background/96 py-2 backdrop-blur-xl">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                aria-label="Open workflow library"
                onClick={onToggleCollapsed}
                size="icon-xs"
                variant="ghost"
              >
                <ChevronRightIcon />
              </Button>
            }
          />
          <TooltipPopup side="right">Open workflow library</TooltipPopup>
        </Tooltip>
        <div className="my-1 h-px w-5 bg-border/70" />
        {WORKFLOW_NODE_DEFINITIONS.map((definition) => {
          const Icon = NODE_KIND_ICON[definition.kind];
          return (
            <Tooltip key={definition.kind}>
              <TooltipTrigger
                render={
                  <Button
                    aria-label={`Add ${definition.label}`}
                    className={NODE_KIND_ACCENT[definition.kind]}
                    onClick={() => onAddNode(definition.kind)}
                    size="icon-xs"
                    variant="ghost"
                  >
                    <Icon />
                  </Button>
                }
              />
              <TooltipPopup side="right">Add {definition.label}</TooltipPopup>
            </Tooltip>
          );
        })}
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-[248px] shrink-0 flex-col border-r border-border/65 bg-background/96 backdrop-blur-xl">
      <div className="flex h-11 items-center justify-between border-b border-border/60 px-3">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-foreground text-background">
            <BoxesIcon className="size-3.5" />
          </span>
          <div>
            <p className="text-[11px] font-semibold">Workflow studio</p>
            <p className="text-[9px] text-muted-foreground">Workspace templates</p>
          </div>
        </div>
        <Button
          aria-label="Collapse workflow library"
          onClick={onToggleCollapsed}
          size="icon-xs"
          variant="ghost"
        >
          <ChevronLeftIcon />
        </Button>
      </div>

      <section className="border-b border-border/60 p-2.5">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Templates
          </span>
          <Button
            aria-label="New workflow template"
            onClick={onCreateTemplate}
            size="icon-xs"
            variant="ghost"
          >
            <PlusIcon />
          </Button>
        </div>
        <div className="max-h-44 space-y-1 overflow-y-auto pr-0.5">
          {summaries.map((summary) => {
            const selected = summary.id === selectedTemplate.id;
            return (
              <button
                className={cn(
                  "group w-full rounded-lg px-2.5 py-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  selected
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-muted/55 hover:text-foreground",
                )}
                key={summary.id}
                onClick={() => selectTemplate(summary.id)}
                type="button"
              >
                <span className="flex items-start gap-2">
                  <span
                    className={cn(
                      "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md",
                      selected ? "bg-background" : "bg-muted/70",
                    )}
                  >
                    <LayoutTemplateIcon className="size-3" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-medium">{summary.name}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[9px]">
                      <span
                        className={cn(
                          "size-1 rounded-full",
                          summary.status === "Published" ? "bg-success" : "bg-warning",
                        )}
                      />
                      {summary.status} · v{summary.version}
                    </span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex min-h-0 flex-1 flex-col p-2.5">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Node library
          </span>
          <SparklesIcon className="size-3 text-primary" />
        </div>
        <div className="relative mb-2">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search workflow nodes"
            className="h-7 bg-muted/25 pl-7 text-[10px] shadow-none"
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Search nodes…"
            value={query}
          />
        </div>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-0.5">
          {matchingDefinitions.map((definition) => (
            <NodeLibraryItem definition={definition} key={definition.kind} onAdd={onAddNode} />
          ))}
        </div>
        <p className="mt-2 rounded-md border border-dashed border-border/70 px-2 py-1.5 text-[9px] leading-4 text-muted-foreground">
          Add a node, then drag a typed output to the next step. Reusable here; executions stay in
          their project.
        </p>
      </section>
    </aside>
  );
}

function NodeLibraryItem({
  definition,
  onAdd,
}: {
  readonly definition: WorkflowNodeDefinition;
  readonly onAdd: (kind: WorkflowNode["kind"]) => void;
}) {
  const Icon = NODE_KIND_ICON[definition.kind];
  return (
    <button
      className="group flex w-full items-start gap-2.5 rounded-lg border border-transparent px-2 py-2 text-left outline-none transition-colors hover:border-border/60 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() => onAdd(definition.kind)}
      type="button"
    >
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-lg",
          NODE_KIND_ACCENT[definition.kind],
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-foreground/90">{definition.label}</span>
          <PlusIcon className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </span>
        <span className="mt-0.5 line-clamp-2 block text-[9px] leading-3.5 text-muted-foreground">
          {definition.description}
        </span>
      </span>
    </button>
  );
}

function BuilderToolbar({
  canRedo,
  canUndo,
  inspectorOpen,
  onFit,
  onOpenSettings,
  onPublish,
  onRedo,
  onTest,
  onTidy,
  onToggleInspector,
  onUndo,
  onValidate,
  template,
  tool,
  validationCount,
  onToolChange,
}: {
  readonly canRedo: boolean;
  readonly canUndo: boolean;
  readonly inspectorOpen: boolean;
  readonly onFit: () => void;
  readonly onOpenSettings: () => void;
  readonly onPublish: () => void;
  readonly onRedo: () => void;
  readonly onTest: () => void;
  readonly onTidy: () => void;
  readonly onToggleInspector: () => void;
  readonly onUndo: () => void;
  readonly onValidate: () => void;
  readonly template: WorkflowTemplate;
  readonly tool: "select" | "pan";
  readonly validationCount: number;
  readonly onToolChange: (tool: "select" | "pan") => void;
}) {
  const summary = deriveWorkflowSummaries([template])[0]!;
  return (
    <div className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-border/65 bg-background/92 px-3 backdrop-blur-xl">
      <div className="flex min-w-0 items-center gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="max-w-64 truncate text-[11px] font-semibold">
              {template.draft.content.name}
            </p>
            <Badge size="sm" variant={summary.status === "Published" ? "success" : "warning"}>
              {summary.status}
            </Badge>
          </div>
          <p className="text-[9px] text-muted-foreground">
            v{summary.version} · revision {template.draft.revision}
          </p>
        </div>
        <div className="ml-2 hidden items-center rounded-md border border-border/70 bg-muted/20 p-0.5 sm:flex">
          <Button
            aria-label="Select tool"
            onClick={() => onToolChange("select")}
            size="icon-xs"
            variant={tool === "select" ? "secondary" : "ghost"}
          >
            <CircleDotIcon />
          </Button>
          <Button
            aria-label="Pan tool"
            onClick={() => onToolChange("pan")}
            size="icon-xs"
            variant={tool === "pan" ? "secondary" : "ghost"}
          >
            <HandIcon />
          </Button>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <ToolbarIconButton disabled={!canUndo} label="Undo" onClick={onUndo}>
          <Undo2Icon />
        </ToolbarIconButton>
        <ToolbarIconButton disabled={!canRedo} label="Redo" onClick={onRedo}>
          <Redo2Icon />
        </ToolbarIconButton>
        <div className="mx-1 h-5 w-px bg-border/70" />
        <ToolbarIconButton label="Tidy layout" onClick={onTidy}>
          <BracesIcon />
        </ToolbarIconButton>
        <ToolbarIconButton label="Fit workflow" onClick={onFit}>
          <Maximize2Icon />
        </ToolbarIconButton>
        <ToolbarIconButton label="Validate workflow" onClick={onValidate}>
          <AlertTriangleIcon />
        </ToolbarIconButton>
        <ToolbarIconButton label="Workflow settings" onClick={onOpenSettings}>
          <Settings2Icon />
        </ToolbarIconButton>
        <Button className="ml-1" onClick={onTest} size="xs" variant="outline">
          <PlayIcon />
          Test
        </Button>
        <Button className="relative" onClick={onPublish} size="xs">
          <RocketIcon />
          Publish
          {validationCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex size-3.5 items-center justify-center rounded-full bg-destructive font-mono text-[8px] text-destructive-foreground ring-2 ring-background">
              {validationCount}
            </span>
          ) : null}
        </Button>
        <ToolbarIconButton
          label={inspectorOpen ? "Hide inspector" : "Show inspector"}
          onClick={onToggleInspector}
        >
          <PanelRightIcon />
        </ToolbarIconButton>
      </div>
    </div>
  );
}

function ToolbarIconButton({
  children,
  disabled,
  label,
  onClick,
}: {
  readonly children: ReactNode;
  readonly disabled?: boolean;
  readonly label: string;
  readonly onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
            size="icon-xs"
            variant="ghost"
          >
            {children}
          </Button>
        }
      />
      <TooltipPopup side="bottom">{label}</TooltipPopup>
    </Tooltip>
  );
}

function createTidyCommand(
  template: WorkflowTemplate,
): Extract<WorkflowCommand, { type: "nodes.move" }> {
  const { edges, nodes } = template.draft.content.graph;
  const incomingCount = new Map(nodes.map(({ id }) => [id, 0]));
  const outgoing = new Map(nodes.map(({ id }) => [id, [] as string[]]));
  for (const edge of edges) {
    incomingCount.set(edge.targetNodeId, (incomingCount.get(edge.targetNodeId) ?? 0) + 1);
    outgoing.get(edge.sourceNodeId)?.push(edge.targetNodeId);
  }
  const levelById = new Map<string, number>();
  const queue = nodes.filter(({ id, kind }) => kind === "trigger" || incomingCount.get(id) === 0);
  for (const node of queue) levelById.set(node.id, 0);
  for (let index = 0; index < queue.length; index += 1) {
    const node = queue[index]!;
    const level = levelById.get(node.id) ?? 0;
    for (const targetId of outgoing.get(node.id) ?? []) {
      levelById.set(targetId, Math.max(levelById.get(targetId) ?? 0, level + 1));
      const target = nodes.find(({ id }) => id === targetId);
      if (target && !queue.some(({ id }) => id === targetId)) queue.push(target);
    }
  }
  const rowByLevel = new Map<number, number>();
  return {
    type: "nodes.move",
    positions: Object.fromEntries(
      nodes.map((node) => {
        const level = levelById.get(node.id) ?? 0;
        const row = rowByLevel.get(level) ?? 0;
        rowByLevel.set(level, row + 1);
        return [node.id, { x: 100 + level * 340, y: 110 + row * 220 }];
      }),
    ),
  };
}

function WorkflowCanvas({
  inspectorOpen,
  onInspectorOpenChange,
  onToggleRail,
  railCollapsed,
  selectedTemplate,
}: {
  readonly inspectorOpen: boolean;
  readonly onInspectorOpenChange: (open: boolean) => void;
  readonly onToggleRail: () => void;
  readonly railCollapsed: boolean;
  readonly selectedTemplate: WorkflowTemplate;
}) {
  const { selectedProject } = useBaseWorkspace();
  const issueViews = useIssueWorkspaceStore((state) => state.views);
  const kanbanViews = useMemo(
    () =>
      issueViews
        .filter((view) => view.projectId === selectedProject.id && view.layout === "board")
        .map(({ id, name }) => ({ id, name })),
    [issueViews, selectedProject.id],
  );
  const validation = useWorkflowWorkspaceStore(
    (state) =>
      state.validationByTemplateId[selectedTemplate.id] ?? { diagnostics: [], canPublish: false },
  );
  const selectedNodeId = useWorkflowWorkspaceStore((state) => state.selectedNodeId);
  const viewport = useWorkflowWorkspaceStore(
    (state) => state.viewportByTemplateId[selectedTemplate.id] ?? { x: 0, y: 0, zoom: 0.82 },
  );
  const history = useWorkflowWorkspaceStore(
    (state) => state.historyByTemplateId[selectedTemplate.id],
  );
  const testStateByNodeId = useWorkflowWorkspaceStore((state) => state.testStateByNodeId);
  const fullTestState = useWorkflowWorkspaceStore(
    (state) => state.fullTestStateByTemplateId[selectedTemplate.id],
  );
  const triggerBindings = useWorkflowWorkspaceStore((state) => state.triggerBindings);
  const executeCommand = useWorkflowWorkspaceStore((state) => state.executeCommand);
  const updateMetadata = useWorkflowWorkspaceStore((state) => state.updateMetadata);
  const selectNode = useWorkflowWorkspaceStore((state) => state.selectNode);
  const setViewport = useWorkflowWorkspaceStore((state) => state.setViewport);
  const publish = useWorkflowWorkspaceStore((state) => state.publish);
  const testNode = useWorkflowWorkspaceStore((state) => state.testNode);
  const testWorkflow = useWorkflowWorkspaceStore((state) => state.testWorkflow);
  const setTriggerBinding = useWorkflowWorkspaceStore((state) => state.setTriggerBinding);
  const undo = useWorkflowWorkspaceStore((state) => state.undo);
  const redo = useWorkflowWorkspaceStore((state) => state.redo);
  const [tool, setTool] = useState<"select" | "pan">("select");
  const [insertAfterNodeId, setInsertAfterNodeId] = useState<string | null>(null);
  const [validationOpen, setValidationOpen] = useState(false);
  const reactFlow = useReactFlow<WorkflowCanvasNodeElement, WorkflowCanvasEdgeElement>();

  const canvasTestStates = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(testStateByNodeId).map(([nodeId, state]) => [
          nodeId,
          testStateForCanvas(state),
        ]),
      ),
    [testStateByNodeId],
  );
  const triggerBindingLabels = useMemo(
    () =>
      Object.fromEntries(
        selectedTemplate.draft.content.graph.nodes
          .filter(
            (node) =>
              node.kind === "trigger" &&
              (node.config.event === "issue-status" || node.config.event === "issue-queued"),
          )
          .map((node) => {
            const binding =
              triggerBindings[
                workflowTriggerBindingKey(selectedProject.id, selectedTemplate.id, node.id)
              ];
            return [
              node.id,
              kanbanViews.find(({ id }) => id === binding?.viewId)?.name ?? "All project issues",
            ];
          }),
      ),
    [kanbanViews, selectedProject.id, selectedTemplate, triggerBindings],
  );

  const inspectNode = useCallback(
    (nodeId: string) => {
      selectNode(nodeId);
      onInspectorOpenChange(true);
    },
    [onInspectorOpenChange, selectNode],
  );
  const runNodeTest = useCallback(
    (nodeId: string) => {
      const result = testNode(nodeId);
      if (!result) return;
      toastManager.add({
        type: result.status === "passed" ? "success" : "error",
        title: result.status === "passed" ? "Step test passed" : "Step test failed",
        description: result.message,
      });
    },
    [testNode],
  );
  const requestAddAfter = useCallback((nodeId: string) => {
    setInsertAfterNodeId(nodeId);
  }, []);

  const canvasElements = useMemo(
    () =>
      createWorkflowCanvasElements({
        draft: selectedTemplate.draft,
        validation,
        testStates: canvasTestStates,
        bindingLabels: triggerBindingLabels,
        onAddAfter: requestAddAfter,
        onInspectNode: inspectNode,
        onTestNode: runNodeTest,
      }),
    [
      canvasTestStates,
      inspectNode,
      requestAddAfter,
      runNodeTest,
      selectedTemplate.draft,
      triggerBindingLabels,
      validation,
    ],
  );
  const [nodes, setNodes] = useState<WorkflowCanvasNodeElement[]>(canvasElements.nodes);
  const [edges, setEdges] = useState<WorkflowCanvasEdgeElement[]>(canvasElements.edges);

  useEffect(() => {
    setNodes(
      canvasElements.nodes.map((node) => ({ ...node, selected: node.id === selectedNodeId })),
    );
    setEdges(canvasElements.edges);
  }, [canvasElements, selectedNodeId]);

  const onNodesChange = useCallback(
    (changes: NodeChange<WorkflowCanvasNodeElement>[]) =>
      setNodes((current) => applyNodeChanges(changes, current)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange<WorkflowCanvasEdgeElement>[]) =>
      setEdges((current) => applyEdgeChanges(changes, current)),
    [],
  );
  const onConnect = useCallback<OnConnect>(
    (connection) => {
      const result = workflowConnectionToEdge(
        selectedTemplate.draft,
        connection,
        `${connection.source}:${connection.sourceHandle}:${connection.target}:${Date.now().toString(36)}`,
      );
      if (!result.ok) {
        toastManager.add({
          type: "error",
          title: "Connection blocked",
          description: result.reason,
        });
        return;
      }
      const mutation = executeCommand(selectedTemplate.id, {
        type: "edge.connect",
        edge: result.edge,
      });
      if (!mutation.ok) {
        toastManager.add({
          type: "error",
          title: "Connection blocked",
          description: mutation.reason,
        });
      }
    },
    [executeCommand, selectedTemplate.draft, selectedTemplate.id],
  );
  const isValidConnection = useCallback(
    (connection: Connection | WorkflowCanvasEdgeElement) =>
      workflowConnectionToEdge(
        selectedTemplate.draft,
        {
          source: connection.source,
          sourceHandle: connection.sourceHandle ?? null,
          target: connection.target,
          targetHandle: connection.targetHandle ?? null,
        },
        "connection-preview",
      ).ok,
    [selectedTemplate.draft],
  );
  const onNodesDelete = useCallback<OnNodesDelete<WorkflowCanvasNodeElement>>(
    (deletedNodes) => {
      const result = executeCommand(selectedTemplate.id, {
        type: "nodes.remove",
        nodeIds: deletedNodes.map(({ id }) => id),
      });
      if (!result.ok)
        toastManager.add({ type: "error", title: "Delete blocked", description: result.reason });
      selectNode(null);
    },
    [executeCommand, selectNode, selectedTemplate.id],
  );
  const onEdgesDelete = useCallback<OnEdgesDelete<WorkflowCanvasEdgeElement>>(
    (deletedEdges) => {
      const result = executeCommand(selectedTemplate.id, {
        type: "edges.remove",
        edgeIds: deletedEdges.map(({ id }) => id),
      });
      if (!result.ok)
        toastManager.add({ type: "error", title: "Delete blocked", description: result.reason });
    },
    [executeCommand, selectedTemplate.id],
  );
  const onNodeDragStop = useCallback(() => {
    const command = workflowNodePositionsCommand(nodes);
    if (command) executeCommand(selectedTemplate.id, command);
  }, [executeCommand, nodes, selectedTemplate.id]);

  const addNode = useCallback(
    (kind: WorkflowNode["kind"]) => {
      const source = insertAfterNodeId
        ? selectedTemplate.draft.content.graph.nodes.find(({ id }) => id === insertAfterNodeId)
        : null;
      const nodeId = `${selectedTemplate.id}:${kind}:${Date.now().toString(36)}`;
      const node = createWorkflowNode(kind, nodeId, {
        x: source
          ? source.position.x + 340
          : 120 + selectedTemplate.draft.content.graph.nodes.length * 70,
        y: source
          ? source.position.y
          : 120 + (selectedTemplate.draft.content.graph.nodes.length % 4) * 150,
      });
      const result = executeCommand(selectedTemplate.id, { type: "node.add", node });
      if (!result.ok) {
        toastManager.add({
          type: "error",
          title: "Node could not be added",
          description: result.reason,
        });
        return;
      }
      if (source && node.kind !== "trigger") {
        const output = workflowNodeOutputs(source)[0];
        const currentDraft = useWorkflowWorkspaceStore
          .getState()
          .templates.find(({ id }) => id === selectedTemplate.id)?.draft;
        if (output && currentDraft) {
          const edgeResult = workflowConnectionToEdge(
            currentDraft,
            {
              source: source.id,
              sourceHandle: output.id,
              target: node.id,
              targetHandle: "input",
            },
            `${source.id}:${output.id}:${node.id}`,
          );
          if (edgeResult.ok)
            executeCommand(selectedTemplate.id, { type: "edge.connect", edge: edgeResult.edge });
        }
      }
      setInsertAfterNodeId(null);
      selectNode(node.id);
      onInspectorOpenChange(true);
    },
    [executeCommand, insertAfterNodeId, onInspectorOpenChange, selectNode, selectedTemplate],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.matches("input, textarea, select")) return;
      if (!(event.metaKey || event.ctrlKey) || event.key.toLocaleLowerCase() !== "z") return;
      event.preventDefault();
      if (event.shiftKey) redo(selectedTemplate.id);
      else undo(selectedTemplate.id);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [redo, selectedTemplate.id, undo]);

  const selectedNode =
    selectedTemplate.draft.content.graph.nodes.find(({ id }) => id === selectedNodeId) ?? null;
  const selectedTriggerBinding =
    selectedNode?.kind === "trigger"
      ? triggerBindings[
          workflowTriggerBindingKey(selectedProject.id, selectedTemplate.id, selectedNode.id)
        ]
      : undefined;
  const blockingErrors = validation.diagnostics.filter(({ severity }) => severity === "error");
  const showValidation = validationOpen;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <BuilderToolbar
        canRedo={Boolean(history?.future.length)}
        canUndo={Boolean(history?.past.length)}
        inspectorOpen={inspectorOpen}
        onFit={() => void reactFlow.fitView({ duration: 320, padding: 0.18 })}
        onOpenSettings={() => {
          selectNode(null);
          onInspectorOpenChange(true);
        }}
        onPublish={() => {
          const result = publish(selectedTemplate.id);
          toastManager.add({
            type: result.ok ? "success" : "error",
            title: result.ok ? `Published v${result.version.version}` : "Publish blocked",
            description: result.ok
              ? "This immutable version is ready for project runs."
              : result.reason,
          });
          if (!result.ok) setValidationOpen(true);
        }}
        onRedo={() => redo(selectedTemplate.id)}
        onTest={() => {
          const result = testWorkflow(selectedTemplate.id);
          if (!result) return;
          toastManager.add({
            type: result.status === "passed" ? "success" : "error",
            title: result.status === "passed" ? "Workflow test passed" : "Workflow test failed",
            description: result.message,
          });
        }}
        onTidy={() => {
          executeCommand(selectedTemplate.id, createTidyCommand(selectedTemplate));
          window.setTimeout(() => void reactFlow.fitView({ duration: 360, padding: 0.18 }), 40);
        }}
        onToggleInspector={() => onInspectorOpenChange(!inspectorOpen)}
        onUndo={() => undo(selectedTemplate.id)}
        onValidate={() => setValidationOpen(true)}
        onToolChange={setTool}
        template={selectedTemplate}
        tool={tool}
        validationCount={blockingErrors.length}
      />

      <div className="relative flex min-h-0 flex-1">
        <TemplateRail
          collapsed={railCollapsed}
          onAddNode={addNode}
          onCreateTemplate={() => {
            const template = useWorkflowWorkspaceStore.getState().createTemplate({
              name: "Untitled workflow",
              description: "Describe when this workflow should run and what outcome it produces.",
            });
            toastManager.add({
              type: "success",
              title: "Workflow created",
              description: "A reusable draft template is ready to edit.",
            });
            selectNode(template.draft.content.graph.nodes[0]?.id ?? null);
            onInspectorOpenChange(true);
          }}
          onToggleCollapsed={onToggleRail}
          selectedTemplate={selectedTemplate}
        />

        <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden bg-[radial-gradient(circle_at_50%_0%,color-mix(in_srgb,var(--color-primary)_5%,transparent),transparent_38%)]">
          <ReactFlow<WorkflowCanvasNodeElement, WorkflowCanvasEdgeElement>
            colorMode="system"
            defaultViewport={viewport}
            deleteKeyCode={["Backspace", "Delete"]}
            edges={edges}
            edgeTypes={workflowEdgeTypes}
            elementsSelectable={tool === "select"}
            fitViewOptions={{ padding: 0.18 }}
            isValidConnection={isValidConnection}
            minZoom={0.2}
            nodes={nodes}
            nodeTypes={workflowNodeTypes}
            nodesConnectable={tool === "select"}
            nodesDraggable={tool === "select"}
            onConnect={onConnect}
            onEdgesChange={onEdgesChange}
            onEdgesDelete={onEdgesDelete}
            onMoveEnd={(_event, nextViewport) => setViewport(selectedTemplate.id, nextViewport)}
            onNodeClick={(_event, node) => inspectNode(node.id)}
            onNodeDragStop={onNodeDragStop}
            onNodesChange={onNodesChange}
            onNodesDelete={onNodesDelete}
            onPaneClick={() => selectNode(null)}
            panOnDrag={tool === "pan" ? true : [1, 2]}
            panOnScroll
            selectionOnDrag={tool === "select"}
            snapGrid={[20, 20]}
            snapToGrid
          >
            <Background
              color="color-mix(in srgb, var(--color-muted-foreground) 20%, transparent)"
              gap={20}
              size={1.25}
              variant={BackgroundVariant.Dots}
            />
            <Controls
              className="!overflow-hidden !rounded-lg !border-border/70 !bg-background/90 !shadow-lg"
              position="bottom-left"
              showInteractive={false}
            />
            <MiniMap
              className="!h-24 !w-36 !rounded-lg !border !border-border/70 !bg-background/88 !shadow-lg"
              maskColor="color-mix(in srgb, var(--color-background) 68%, transparent)"
              nodeColor={(node) => {
                const kind = (node as WorkflowCanvasNodeElement).data.node.kind;
                return kind === "trigger"
                  ? "#f59e0b"
                  : kind === "agent"
                    ? "#8b5cf6"
                    : kind === "test"
                      ? "#10b981"
                      : kind === "approval"
                        ? "#f97316"
                        : kind === "branch"
                          ? "#3b82f6"
                          : "#06b6d4";
              }}
              pannable
              position="bottom-right"
              zoomable
            />
            <Panel className="!m-3" position="top-left">
              {insertAfterNodeId ? (
                <div className="flex items-center gap-2 rounded-lg border border-primary/25 bg-background/92 px-2.5 py-2 text-[10px] shadow-lg backdrop-blur-xl">
                  <SparklesIcon className="size-3.5 text-primary" />
                  Choose a node from the library to connect next.
                  <Button
                    aria-label="Cancel contextual add"
                    onClick={() => setInsertAfterNodeId(null)}
                    size="icon-xs"
                    variant="ghost"
                  >
                    ×
                  </Button>
                </div>
              ) : null}
            </Panel>
            <Panel className="!mb-3" position="bottom-center">
              <div className="flex items-center gap-2 rounded-md border border-border/60 bg-background/85 px-2 py-1 text-[9px] text-muted-foreground shadow-sm backdrop-blur-md">
                <span>Pan</span>
                <Kbd>Space</Kbd>
                <span>·</span>
                <span>Undo</span>
                <Kbd>⌘ Z</Kbd>
                <span>·</span>
                <span>Delete</span>
                <Kbd>⌫</Kbd>
              </div>
            </Panel>
          </ReactFlow>

          {showValidation ? (
            <div className="absolute right-3 top-3 z-10 w-80 overflow-hidden rounded-xl border border-border/70 bg-background/94 shadow-xl backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  {blockingErrors.length ? (
                    <AlertTriangleIcon className="size-3.5 text-destructive" />
                  ) : (
                    <CheckCircle2Icon className="size-3.5 text-success" />
                  )}
                  <span className="text-[11px] font-semibold">Workflow validation</span>
                </div>
                <Button
                  aria-label="Close validation"
                  onClick={() => setValidationOpen(false)}
                  size="icon-xs"
                  variant="ghost"
                >
                  ×
                </Button>
              </div>
              <div className="max-h-72 space-y-1.5 overflow-y-auto p-2.5">
                {validation.diagnostics.length === 0 ? (
                  <div className="rounded-lg bg-success/8 px-3 py-3 text-[10px] text-success-foreground">
                    All graph and configuration checks pass. This draft is ready to publish.
                  </div>
                ) : (
                  validation.diagnostics.map((diagnostic) => (
                    <button
                      className="w-full rounded-lg border border-border/60 px-2.5 py-2 text-left hover:bg-muted/35"
                      key={`${diagnostic.code}-${diagnostic.nodeId ?? diagnostic.edgeId ?? "graph"}`}
                      onClick={() => diagnostic.nodeId && inspectNode(diagnostic.nodeId)}
                      type="button"
                    >
                      <span className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-destructive">
                        <AlertTriangleIcon className="size-3" />
                        {diagnostic.severity}
                      </span>
                      <span className="mt-1 block text-[10px] leading-4 text-muted-foreground">
                        {diagnostic.message}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : null}

          {fullTestState && fullTestState.status !== "idle" ? (
            <div
              className={cn(
                "absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-lg border bg-background/94 px-3 py-2 text-[10px] shadow-lg backdrop-blur-xl",
                fullTestState.status === "passed" ? "border-success/25" : "border-destructive/25",
              )}
            >
              {fullTestState.status === "passed" ? (
                <CheckCircle2Icon className="size-3.5 text-success" />
              ) : (
                <AlertTriangleIcon className="size-3.5 text-destructive" />
              )}
              <span className="font-medium">{fullTestState.message}</span>
              <span className="font-mono text-muted-foreground">{fullTestState.durationMs}ms</span>
            </div>
          ) : null}
        </main>

        {inspectorOpen ? (
          <WorkflowInspector
            diagnostics={validation.diagnostics}
            kanbanViews={kanbanViews}
            node={selectedNode}
            onClose={() => onInspectorOpenChange(false)}
            onUpdateNode={(node) => {
              const result = executeCommand(selectedTemplate.id, { type: "node.update", node });
              toastManager.add({
                type: result.ok ? "success" : "error",
                title: result.ok ? "Step updated" : "Update blocked",
                description: result.ok ? "Validation refreshed for this draft." : result.reason,
              });
            }}
            onUpdateTriggerView={(viewId) => {
              if (selectedNode?.kind !== "trigger") return;
              const result = setTriggerBinding({
                projectId: selectedProject.id,
                templateId: selectedTemplate.id,
                nodeId: selectedNode.id,
                viewId,
              });
              toastManager.add({
                type: result.ok ? "success" : "error",
                title: result.ok ? "Board trigger updated" : "Binding blocked",
                description: result.ok
                  ? `${selectedProject.name} will evaluate this trigger against ${kanbanViews.find(({ id }) => id === viewId)?.name ?? "all project issues"}.`
                  : result.reason,
              });
            }}
            onUpdateWorkflow={(metadata) => {
              const result = updateMetadata(selectedTemplate.id, metadata);
              toastManager.add({
                type: result.ok ? "success" : "error",
                title: result.ok ? "Workflow updated" : "Update blocked",
                description: result.ok ? "Template metadata saved." : result.reason,
              });
            }}
            projectName={selectedProject.name}
            triggerViewId={selectedTriggerBinding?.viewId ?? null}
            workflowDescription={selectedTemplate.draft.content.description}
            workflowName={selectedTemplate.draft.content.name}
          />
        ) : null}
      </div>
    </div>
  );
}

export function WorkflowBuilder() {
  const { selectedProject } = useBaseWorkspace();
  const templates = useWorkflowWorkspaceStore((state) => state.templates);
  const selectedTemplateId = useWorkflowWorkspaceStore((state) => state.selectedTemplateId);
  const selectTemplate = useWorkflowWorkspaceStore((state) => state.selectTemplate);
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const selectedTemplate =
    templates.find(({ id }) => id === selectedTemplateId) ?? templates[0] ?? null;

  useEffect(() => {
    if (!selectedTemplate && templates[0]) selectTemplate(templates[0].id);
  }, [selectTemplate, selectedTemplate, templates]);

  if (!selectedTemplate) {
    return (
      <BasePageShell
        density="canvas"
        description="Build reusable workflow templates."
        title="Workflows"
      >
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          No workflow templates are available.
        </div>
      </BasePageShell>
    );
  }

  return (
    <BasePageShell
      density="canvas"
      description={`Build reusable workflows for every project. Runs remain scoped to ${selectedProject.name}.`}
      title="Workflows"
    >
      <ReactFlowProvider key={selectedTemplate.id}>
        <WorkflowCanvas
          inspectorOpen={inspectorOpen}
          onInspectorOpenChange={setInspectorOpen}
          onToggleRail={() => setRailCollapsed((value) => !value)}
          railCollapsed={railCollapsed}
          selectedTemplate={selectedTemplate}
        />
      </ReactFlowProvider>
    </BasePageShell>
  );
}

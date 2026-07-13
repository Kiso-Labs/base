import {
  AlertTriangleIcon,
  BotIcon,
  CheckCircle2Icon,
  Clock3Icon,
  FlaskConicalIcon,
  GitBranchIcon,
  Layers3Icon,
  LoaderCircleIcon,
  PlayIcon,
  PlusIcon,
  RotateCcwIcon,
  Settings2Icon,
  ShieldCheckIcon,
  WebhookIcon,
  XCircleIcon,
  ZapIcon,
} from "lucide-react";
import { memo, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { Handle, NodeToolbar, Position, type Node, type NodeProps } from "@xyflow/react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

import type {
  WorkflowDiagnostic,
  WorkflowEdge,
  WorkflowNode,
  WorkflowRetryPolicy,
} from "./workflowGraph";
import { workflowNodeOutputs, workflowNodeSummary } from "./workflowNodeCatalog";

export const WORKFLOW_CANVAS_NODE_TYPE = "workflow" as const;
export const WORKFLOW_INPUT_HANDLE_ID = "input" as const;

export type WorkflowNodeTestState =
  | "idle"
  | "running"
  | "succeeded"
  | "failed"
  | "waiting-for-approval";

export type WorkflowCanvasFinding = Pick<WorkflowDiagnostic, "severity" | "message">;

export type WorkflowCanvasNodeData = {
  readonly node: WorkflowNode;
  readonly findings?: readonly WorkflowCanvasFinding[];
  readonly testState?: WorkflowNodeTestState;
  readonly bindingLabel?: string;
  readonly onAddAfter?: (nodeId: string) => void;
  readonly onInspect?: (nodeId: string) => void;
  readonly onTest?: (nodeId: string) => void;
};

export type WorkflowCanvasNodeElement = Node<
  WorkflowCanvasNodeData,
  typeof WORKFLOW_CANVAS_NODE_TYPE
>;

interface OutcomePresentation {
  readonly handleId: string;
  readonly label: string;
  readonly detail?: string;
  readonly tone: "success" | "failure" | "approval" | "branch" | "default";
}

const KIND_PRESENTATION = {
  agent: {
    icon: BotIcon,
    label: "Agent",
    accent: "bg-violet-500",
    iconClass: "bg-violet-500/12 text-violet-700 dark:text-violet-300",
  },
  approval: {
    icon: ShieldCheckIcon,
    label: "Approval",
    accent: "bg-orange-500",
    iconClass: "bg-orange-500/12 text-orange-700 dark:text-orange-300",
  },
  branch: {
    icon: GitBranchIcon,
    label: "Branch",
    accent: "bg-blue-500",
    iconClass: "bg-blue-500/12 text-blue-700 dark:text-blue-300",
  },
  hook: {
    icon: WebhookIcon,
    label: "Hook",
    accent: "bg-cyan-500",
    iconClass: "bg-cyan-500/12 text-cyan-700 dark:text-cyan-300",
  },
  test: {
    icon: FlaskConicalIcon,
    label: "Test",
    accent: "bg-emerald-500",
    iconClass: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  },
  trigger: {
    icon: ZapIcon,
    label: "Trigger",
    accent: "bg-amber-500",
    iconClass: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
  },
} as const;

const OUTCOME_STYLES: Record<OutcomePresentation["tone"], string> = {
  approval: "bg-orange-500/80",
  branch: "bg-blue-500/80",
  default: "bg-muted-foreground/55",
  failure: "bg-destructive/80",
  success: "bg-success/80",
};

const HANDLE_STYLES: Record<OutcomePresentation["tone"], string> = {
  approval:
    "!bg-orange-500 hover:!shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-orange-500)_16%,transparent)]",
  branch:
    "!bg-blue-500 hover:!shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-blue-500)_16%,transparent)]",
  default:
    "!bg-muted-foreground hover:!shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-muted-foreground)_16%,transparent)]",
  failure:
    "!bg-destructive hover:!shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-destructive)_16%,transparent)]",
  success:
    "!bg-success hover:!shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-success)_16%,transparent)]",
};

export function getWorkflowSourceHandleId(edge: WorkflowEdge): string {
  switch (edge.kind) {
    case "success":
      return "success";
    case "failure":
      return "failure";
    case "approval":
      return edge.outcome;
    case "branch":
      return edge.caseId ?? "default";
  }
}

export function summarizeWorkflowNode(node: WorkflowNode): string {
  return workflowNodeSummary(node);
}

function WorkflowCanvasNodeComponent({
  data,
  isConnectable,
  selected,
}: NodeProps<WorkflowCanvasNodeElement>) {
  const { node } = data;
  const presentation = KIND_PRESENTATION[node.kind];
  const Icon = presentation.icon;
  const outcomes = getNodeOutcomes(node);
  const retry = retryPolicyFor(node);
  const findings = data.findings ?? [];
  const errors = findings.filter(({ severity }) => severity === "error");
  const warnings = findings.length - errors.length;
  const testState = data.testState ?? "idle";
  const canTest = node.kind === "agent" || node.kind === "test" || node.kind === "hook";
  const hasToolbar = Boolean(data.onAddAfter || data.onInspect || (canTest && data.onTest));
  const handlesVisibleClass = selected
    ? "!opacity-100"
    : "!opacity-0 group-hover/node:!opacity-100 group-focus-within/node:!opacity-100";
  const findingsTitle = findings.map(({ message }) => message).join("\n");

  return (
    <>
      <NodeToolbar
        align="end"
        isVisible={selected && hasToolbar}
        offset={9}
        position={Position.Top}
      >
        <div className="nodrag nopan flex items-center gap-0.5 rounded-lg border border-border/75 bg-popover/96 p-0.5 shadow-lg backdrop-blur-md">
          {canTest && data.onTest ? (
            <ToolbarButton
              ariaLabel={`Test ${node.name}`}
              disabled={testState === "running" || node.disabled}
              onClick={() => data.onTest?.(node.id)}
              title="Test node"
            >
              <PlayIcon />
            </ToolbarButton>
          ) : null}
          {data.onAddAfter ? (
            <ToolbarButton
              ariaLabel={`Add a step after ${node.name}`}
              onClick={() => data.onAddAfter?.(node.id)}
              title="Add next step"
            >
              <PlusIcon />
            </ToolbarButton>
          ) : null}
          {data.onInspect ? (
            <ToolbarButton
              ariaLabel={`Open settings for ${node.name}`}
              onClick={() => data.onInspect?.(node.id)}
              title="Open inspector"
            >
              <Settings2Icon />
            </ToolbarButton>
          ) : null}
        </div>
      </NodeToolbar>

      <article
        aria-disabled={node.disabled}
        aria-label={`${presentation.label} node: ${node.name}. ${summarizeWorkflowNode(node)}`}
        className={cn(
          "group/node relative w-64 overflow-visible rounded-xl border bg-card/96 text-card-foreground shadow-[0_1px_2px_color-mix(in_srgb,var(--color-foreground)_5%,transparent),0_10px_30px_color-mix(in_srgb,var(--color-foreground)_7%,transparent)] backdrop-blur-sm transition-[border-color,box-shadow,opacity,transform] duration-150",
          selected
            ? "border-ring/75 shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-ring)_14%,transparent),0_16px_40px_color-mix(in_srgb,var(--color-foreground)_11%,transparent)]"
            : "border-border/80 hover:border-border hover:shadow-[0_14px_34px_color-mix(in_srgb,var(--color-foreground)_10%,transparent)]",
          node.disabled && "opacity-55 grayscale-[0.2]",
        )}
        data-kind={node.kind}
        data-selected={selected || undefined}
        onDoubleClick={(event) => {
          if (!data.onInspect) return;
          event.stopPropagation();
          data.onInspect(node.id);
        }}
      >
        <span aria-hidden className={cn("absolute inset-y-0 left-0 w-0.5", presentation.accent)} />

        {node.kind !== "trigger" ? (
          <Handle
            aria-label={`Input to ${node.name}`}
            className={cn(
              "!size-3 !border-[3px] !border-card !bg-muted-foreground !transition-[opacity,box-shadow] duration-150 hover:!shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-muted-foreground)_16%,transparent)]",
              handlesVisibleClass,
            )}
            id={WORKFLOW_INPUT_HANDLE_ID}
            isConnectable={isConnectable && !node.disabled}
            position={Position.Left}
            title={`Input to ${node.name}`}
            type="target"
          />
        ) : null}

        <div className="px-3.5 pt-3 pb-2.5">
          <div className="flex min-w-0 items-start gap-2.5">
            <div
              aria-hidden
              className={cn(
                "mt-px flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-current/10",
                presentation.iconClass,
              )}
            >
              <Icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-[12px] font-semibold leading-4 text-foreground">
                  {node.name}
                </p>
                <span className="shrink-0 font-mono text-[8px] font-semibold tracking-[0.14em] text-muted-foreground/70 uppercase">
                  {presentation.label}
                </span>
              </div>
              <p
                className={cn(
                  "mt-1 truncate text-[10px] leading-4 text-muted-foreground",
                  (node.kind === "test" || node.kind === "hook") && "font-mono",
                )}
                title={summarizeWorkflowNode(node)}
              >
                {summarizeWorkflowNode(node)}
              </p>
            </div>
          </div>

          {retry ||
          node.disabled ||
          findings.length > 0 ||
          testState !== "idle" ||
          data.bindingLabel ? (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {data.bindingLabel ? (
                <Badge
                  size="sm"
                  title={`Project trigger scope: ${data.bindingLabel}`}
                  variant="info"
                >
                  <Layers3Icon />
                  {data.bindingLabel}
                </Badge>
              ) : null}
              {retry ? <RetryBadge retry={retry} /> : null}
              {node.disabled ? (
                <Badge size="sm" variant="secondary">
                  Disabled
                </Badge>
              ) : null}
              {errors.length > 0 ? (
                <Badge size="sm" title={findingsTitle} variant="error">
                  <AlertTriangleIcon />
                  {errors.length} {errors.length === 1 ? "error" : "errors"}
                </Badge>
              ) : warnings > 0 ? (
                <Badge size="sm" title={findingsTitle} variant="warning">
                  <AlertTriangleIcon />
                  {warnings} {warnings === 1 ? "warning" : "warnings"}
                </Badge>
              ) : null}
              <TestStateBadge state={testState} />
            </div>
          ) : null}
        </div>

        <div className="rounded-b-[11px] border-border/60 border-t bg-muted/18 px-2.5 py-1.5">
          {outcomes.map((outcome) => (
            <div
              className="relative flex h-5.5 items-center justify-end gap-1.5 pr-2.5 text-[9px] font-medium text-muted-foreground"
              key={outcome.handleId}
              title={outcome.detail}
            >
              <span
                aria-hidden
                className={cn("size-1.5 rounded-full", OUTCOME_STYLES[outcome.tone])}
              />
              <span className="max-w-40 truncate">{outcome.label}</span>
              <Handle
                aria-label={`${outcome.label} output from ${node.name}`}
                className={cn(
                  "!size-3 !border-[3px] !border-card !transition-[opacity,box-shadow] duration-150",
                  HANDLE_STYLES[outcome.tone],
                  handlesVisibleClass,
                )}
                id={outcome.handleId}
                isConnectable={isConnectable && !node.disabled}
                position={Position.Right}
                title={`${outcome.label} output from ${node.name}`}
                type="source"
              />
            </div>
          ))}
        </div>
      </article>
    </>
  );
}

function ToolbarButton({
  ariaLabel,
  children,
  disabled,
  onClick,
  title,
}: {
  readonly ariaLabel: string;
  readonly children: ReactNode;
  readonly disabled?: boolean;
  readonly onClick: () => void;
  readonly title: string;
}) {
  const stopPointerPropagation = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
  };

  return (
    <Button
      aria-label={ariaLabel}
      className="nodrag nopan"
      disabled={disabled}
      onClick={onClick}
      onPointerDown={stopPointerPropagation}
      size="icon-xs"
      title={title}
      variant="ghost"
    >
      {children}
    </Button>
  );
}

function RetryBadge({ retry }: { readonly retry: WorkflowRetryPolicy }) {
  const retryLabel = `${retry.maxRetries} ${retry.maxRetries === 1 ? "retry" : "retries"}`;
  return (
    <Badge
      size="sm"
      title={`${formatWords(retry.strategy)} backoff from ${retry.delaySeconds}s, capped at ${retry.maxDelaySeconds}s`}
      variant="outline"
    >
      <RotateCcwIcon />
      {retryLabel}
    </Badge>
  );
}

function TestStateBadge({ state }: { readonly state: WorkflowNodeTestState }) {
  switch (state) {
    case "idle":
      return null;
    case "running":
      return (
        <Badge size="sm" variant="info">
          <LoaderCircleIcon className="animate-spin" />
          Testing
        </Badge>
      );
    case "succeeded":
      return (
        <Badge size="sm" variant="success">
          <CheckCircle2Icon />
          Passed
        </Badge>
      );
    case "failed":
      return (
        <Badge size="sm" variant="error">
          <XCircleIcon />
          Failed
        </Badge>
      );
    case "waiting-for-approval":
      return (
        <Badge size="sm" variant="warning">
          <Clock3Icon />
          Waiting
        </Badge>
      );
  }
}

function getNodeOutcomes(node: WorkflowNode): readonly OutcomePresentation[] {
  return workflowNodeOutputs(node).map((output) => {
    const detail =
      node.kind === "branch" && output.id !== "default"
        ? node.config.cases.find(({ id }) => id === output.id)?.expression
        : undefined;
    const presentation = {
      handleId: output.id,
      label: output.label,
      tone: outcomeTone(node, output.id),
    };
    return detail === undefined ? presentation : { ...presentation, detail };
  });
}

function outcomeTone(node: WorkflowNode, outputId: string): OutcomePresentation["tone"] {
  switch (node.kind) {
    case "trigger":
      return "success";
    case "agent":
    case "test":
    case "hook":
      return outputId === "failure" ? "failure" : "success";
    case "approval":
      if (outputId === "approved") return "success";
      if (outputId === "rejected") return "failure";
      return "approval";
    case "branch":
      return outputId === "default" ? "default" : "branch";
  }
}

function retryPolicyFor(node: WorkflowNode): WorkflowRetryPolicy | null {
  switch (node.kind) {
    case "agent":
    case "test":
    case "hook":
      return node.config.retry.maxRetries > 0 ? node.config.retry : null;
    case "trigger":
    case "approval":
    case "branch":
      return null;
  }
}

function formatWords(value: string): string {
  return value
    .split("-")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export const WorkflowCanvasNode = memo(WorkflowCanvasNodeComponent);

export const workflowNodeTypes = {
  [WORKFLOW_CANVAS_NODE_TYPE]: WorkflowCanvasNode,
};

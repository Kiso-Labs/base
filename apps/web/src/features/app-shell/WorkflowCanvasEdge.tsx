import { AlertTriangleIcon } from "lucide-react";
import { memo, type CSSProperties, type ReactNode } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";

import { cn } from "~/lib/utils";

import type { WorkflowEdge } from "./workflowGraph";

export const WORKFLOW_CANVAS_EDGE_TYPE = "workflow-outcome" as const;

export type WorkflowCanvasEdgeData = {
  readonly edge: WorkflowEdge;
  readonly invalid?: boolean;
  readonly finding?: string;
  readonly onInspect?: (edgeId: string) => void;
};

export type WorkflowCanvasEdgeElement = Edge<
  WorkflowCanvasEdgeData,
  typeof WORKFLOW_CANVAS_EDGE_TYPE
>;

type EdgeTone = "success" | "failure" | "approved" | "timed-out" | "branch" | "default";

interface EdgePresentation {
  readonly dash?: string;
  readonly labelClassName: string;
  readonly stroke: string;
}

const EDGE_PRESENTATIONS: Record<EdgeTone, EdgePresentation> = {
  approved: {
    labelClassName: "border-success/25 bg-success/8 text-success-foreground dark:bg-success/12",
    stroke: "var(--success)",
  },
  branch: {
    labelClassName: "border-info/25 bg-info/8 text-info-foreground dark:bg-info/12",
    stroke: "var(--info)",
  },
  default: {
    dash: "5 5",
    labelClassName: "border-border/80 bg-muted text-muted-foreground",
    stroke: "var(--muted-foreground)",
  },
  failure: {
    dash: "7 4",
    labelClassName:
      "border-destructive/25 bg-destructive/8 text-destructive-foreground dark:bg-destructive/12",
    stroke: "var(--destructive)",
  },
  success: {
    labelClassName: "border-success/25 bg-success/8 text-success-foreground dark:bg-success/12",
    stroke: "var(--success)",
  },
  "timed-out": {
    dash: "2 5",
    labelClassName: "border-warning/25 bg-warning/8 text-warning-foreground dark:bg-warning/12",
    stroke: "var(--warning)",
  },
};

export function workflowEdgeLabel(edge: WorkflowEdge): string {
  if (edge.label) return edge.label;
  switch (edge.kind) {
    case "success":
      return "Success";
    case "failure":
      return "Failure";
    case "approval":
      return formatOutcome(edge.outcome);
    case "branch":
      return edge.caseId === null ? "Otherwise" : "Condition";
  }
}

function WorkflowCanvasEdgeComponent({
  data,
  id,
  label,
  markerEnd,
  markerStart,
  selected,
  source,
  sourcePosition,
  sourceX,
  sourceY,
  style,
  target,
  targetPosition,
  targetX,
  targetY,
}: EdgeProps<WorkflowCanvasEdgeElement>) {
  const edge = data?.edge;
  const invalid = data?.invalid ?? false;
  const tone = edge ? workflowEdgeTone(edge) : "default";
  const presentation = EDGE_PRESENTATIONS[tone];
  const semanticLabel = edge ? workflowEdgeLabel(edge) : "Outcome";
  const displayLabel: ReactNode = edge?.label ?? label ?? semanticLabel;
  const accessibleLabel = typeof displayLabel === "string" ? displayLabel : semanticLabel;
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    borderRadius: 18,
    offset: 22,
    sourcePosition,
    sourceX,
    sourceY,
    targetPosition,
    targetX,
    targetY,
  });
  const stroke = invalid ? "var(--destructive)" : presentation.stroke;
  const edgeStyle: CSSProperties = {
    ...style,
    stroke,
    strokeDasharray: invalid ? "3 4" : presentation.dash,
    strokeLinecap: "round",
    strokeWidth: selected ? 2.4 : 1.7,
  };
  const finding = data?.finding;
  const labelClassName = cn(
    "flex max-w-40 items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[8px] leading-3 font-semibold tracking-[0.04em] whitespace-nowrap shadow-sm backdrop-blur-sm transition-[border-color,box-shadow,transform]",
    invalid
      ? "border-destructive/35 bg-destructive/10 text-destructive-foreground"
      : presentation.labelClassName,
    selected && "ring-2 ring-ring/20",
    data?.onInspect && "nodrag nopan cursor-pointer hover:-translate-y-px hover:shadow-md",
  );
  const labelStyle: CSSProperties = {
    pointerEvents: data?.onInspect ? "all" : "none",
    position: "absolute",
    transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
  };

  return (
    <>
      <g
        aria-label={`${accessibleLabel} outcome from ${source} to ${target}${invalid ? ". Invalid connection" : ""}`}
        role="img"
      >
        <BaseEdge
          id={id}
          interactionWidth={22}
          path={edgePath}
          style={edgeStyle}
          {...(markerEnd === undefined ? {} : { markerEnd })}
          {...(markerStart === undefined ? {} : { markerStart })}
        />
      </g>
      <EdgeLabelRenderer>
        {data?.onInspect ? (
          <button
            aria-label={`Inspect ${accessibleLabel} outcome`}
            className={labelClassName}
            onClick={(event) => {
              event.stopPropagation();
              data.onInspect?.(id);
            }}
            onPointerDown={(event) => event.stopPropagation()}
            style={labelStyle}
            title={finding ?? `Inspect ${accessibleLabel} outcome`}
            type="button"
          >
            {invalid ? <AlertTriangleIcon aria-hidden className="size-2.5 shrink-0" /> : null}
            <span className="truncate">{displayLabel}</span>
          </button>
        ) : (
          <span aria-hidden className={labelClassName} style={labelStyle} title={finding}>
            {invalid ? <AlertTriangleIcon aria-hidden className="size-2.5 shrink-0" /> : null}
            <span className="truncate">{displayLabel}</span>
          </span>
        )}
      </EdgeLabelRenderer>
    </>
  );
}

function workflowEdgeTone(edge: WorkflowEdge): EdgeTone {
  switch (edge.kind) {
    case "success":
      return "success";
    case "failure":
      return "failure";
    case "approval":
      if (edge.outcome === "approved") return "approved";
      if (edge.outcome === "timed-out") return "timed-out";
      return "failure";
    case "branch":
      return edge.caseId === null ? "default" : "branch";
  }
}

function formatOutcome(value: string): string {
  return value
    .split("-")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export const WorkflowCanvasEdge = memo(WorkflowCanvasEdgeComponent);

export const workflowEdgeTypes = {
  [WORKFLOW_CANVAS_EDGE_TYPE]: WorkflowCanvasEdge,
};

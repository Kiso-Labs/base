import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  CircleHelpIcon,
  Clock3Icon,
  GitPullRequestIcon,
  ShieldAlertIcon,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

import { IssueStatusBadge, RunStatusBadge } from "../BaseEntityPills";
import { BaseMetricCard, BasePageShell, BasePanel } from "../BasePageShell";
import { useBaseWorkspace } from "../BaseWorkspaceContext";
import type { BaseAttentionItem } from "../workspaceRepository";

type AttentionIcon = ComponentType<SVGProps<SVGSVGElement>>;

const attentionPresentation: Record<
  BaseAttentionItem["kind"],
  { readonly icon: AttentionIcon; readonly label: string; readonly className: string }
> = {
  approval: {
    icon: CheckCircle2Icon,
    label: "Approval",
    className: "border-info/25 bg-info/8 text-info-foreground",
  },
  failure: {
    icon: ShieldAlertIcon,
    label: "Failure",
    className: "border-destructive/25 bg-destructive/8 text-destructive-foreground",
  },
  question: {
    icon: CircleHelpIcon,
    label: "Question",
    className: "border-warning/25 bg-warning/8 text-warning-foreground",
  },
  review: {
    icon: GitPullRequestIcon,
    label: "Review",
    className: "border-success/25 bg-success/8 text-success-foreground",
  },
};

function urgencyVariant(urgency: BaseAttentionItem["urgency"]) {
  if (urgency === "Urgent") return "error" as const;
  if (urgency === "High") return "warning" as const;
  return "secondary" as const;
}

export function InboxPage() {
  const { selectedProject, snapshot } = useBaseWorkspace();
  const projectIssues = snapshot.issues.filter(({ projectId }) => projectId === selectedProject.id);
  const projectIssueIds = new Set(projectIssues.map(({ id }) => id));
  const projectAttentionItems = snapshot.attentionItems.filter(({ issueId }) =>
    projectIssueIds.has(issueId),
  );
  const projectRuns = snapshot.runs.filter(({ projectId }) => projectId === selectedProject.id);
  const urgentCount = projectAttentionItems.filter(({ urgency }) => urgency === "Urgent").length;
  const waitingCount = projectAttentionItems.filter(({ waitingFor }) =>
    waitingFor.includes("hr"),
  ).length;
  const reviewCount = projectAttentionItems.filter(({ kind }) => kind === "review").length;

  return (
    <BasePageShell
      actions={
        <>
          <Button size="sm" variant="outline">
            Inbox policy
          </Button>
          <Button size="sm">Review next</Button>
        </>
      }
      description="Approvals, failures, questions, and completed work that need a human decision."
      title="Inbox"
    >
      <div className="grid grid-cols-2 gap-y-4 rounded-lg border border-border/70 bg-card/25 px-4 py-4 md:grid-cols-4">
        <BaseMetricCard
          detail="Across active workflows"
          label="Needs attention"
          tone="warning"
          value={String(projectAttentionItems.length)}
        />
        <BaseMetricCard
          detail="Policy hook violation"
          label="Urgent"
          tone="warning"
          value={String(urgentCount)}
        />
        <BaseMetricCard
          detail="Waiting longer than 30m"
          label="Aging"
          value={String(waitingCount)}
        />
        <BaseMetricCard
          detail="Changes ready to inspect"
          label="Ready for review"
          tone="success"
          value={String(reviewCount)}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <BasePanel description="Ordered by urgency, then time waiting" title="Attention queue">
          <div className="divide-y divide-border/60">
            {projectAttentionItems.map((item) => {
              const issue = projectIssues.find(({ id }) => id === item.issueId);
              const workflow = snapshot.workflows.find(({ id }) => id === issue?.workflowId);
              const run = projectRuns.find(({ issueId }) => issueId === item.issueId);
              const presentation = attentionPresentation[item.kind];
              const Icon = presentation.icon;

              return (
                <article
                  className="group flex flex-col gap-3 px-3.5 py-3.5 transition-colors hover:bg-muted/25 sm:flex-row sm:items-start"
                  key={item.id}
                >
                  <div
                    className={`flex size-8 shrink-0 items-center justify-center rounded-md border ${presentation.className}`}
                    title={presentation.label}
                  >
                    <Icon aria-hidden="true" className="size-3.5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge size="sm" variant={urgencyVariant(item.urgency)}>
                        {item.urgency}
                      </Badge>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {issue?.identifier ?? "Unknown issue"}
                      </span>
                      {issue ? <IssueStatusBadge status={issue.status} /> : null}
                    </div>
                    <h3 className="mt-2 text-sm font-medium leading-5 text-foreground">
                      {item.title}
                    </h3>
                    <p className="mt-0.5 max-w-3xl text-xs leading-5 text-muted-foreground">
                      {item.detail}
                    </p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] text-muted-foreground/80">
                      <span className="font-medium text-foreground/75">{item.agentName}</span>
                      <span aria-hidden="true" className="size-0.5 rounded-full bg-border" />
                      <span className="truncate">{workflow?.name ?? "No workflow attached"}</span>
                      {run ? (
                        <>
                          <span aria-hidden="true" className="size-0.5 rounded-full bg-border" />
                          <span className="font-mono">{run.id}</span>
                          <RunStatusBadge status={run.status} />
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center justify-between gap-3 sm:min-w-32 sm:flex-col sm:items-end">
                    <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                      <Clock3Icon aria-hidden="true" className="size-3" />
                      {item.waitingFor}
                    </span>
                    <Button className="group/button" size="xs" variant="outline">
                      {item.actionLabel}
                      <ArrowRightIcon
                        aria-hidden="true"
                        className="size-3 transition-transform group-hover/button:translate-x-0.5"
                      />
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </BasePanel>

        <div className="grid content-start gap-4">
          <BasePanel description="Execution related to this inbox" title="Active runs">
            <div className="divide-y divide-border/60">
              {projectRuns.map((run) => {
                const issue = projectIssues.find(({ id }) => id === run.issueId);
                const workflow = snapshot.workflows.find(({ id }) => id === run.workflowId);

                return (
                  <div className="px-3.5 py-3" key={run.id}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] font-medium text-foreground">
                        {run.id}
                      </span>
                      <RunStatusBadge status={run.status} />
                    </div>
                    <p className="mt-2 truncate text-xs font-medium text-foreground/90">
                      {issue?.identifier} · {run.currentStep}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                      {workflow?.name}
                    </p>
                    <div className="mt-2 flex items-center justify-between font-mono text-[9px] text-muted-foreground/70">
                      <span>{run.startedAt}</span>
                      <span>{run.duration}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </BasePanel>

          <BasePanel title="Triage posture">
            <div className="space-y-3 px-3.5 py-3.5">
              <div className="flex items-start gap-2.5">
                <AlertTriangleIcon
                  aria-hidden="true"
                  className="mt-0.5 size-3.5 shrink-0 text-warning-foreground"
                />
                <p className="text-[11px] leading-4 text-muted-foreground">
                  Urgent failures stay above approvals so blocked execution can be recovered first.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2Icon
                  aria-hidden="true"
                  className="mt-0.5 size-3.5 shrink-0 text-success-foreground"
                />
                <p className="text-[11px] leading-4 text-muted-foreground">
                  Reviews remain linked to their issue, workflow, and latest run for an auditable
                  handoff.
                </p>
              </div>
            </div>
          </BasePanel>
        </div>
      </div>
    </BasePageShell>
  );
}

import { Link } from "@tanstack/react-router";
import { ArrowRightIcon, BotIcon, TerminalIcon } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

import { IssueStatusBadge } from "../BaseEntityPills";
import { BaseMetricCard, BasePageShell, BasePanel } from "../BasePageShell";
import { useBaseWorkspace } from "../BaseWorkspaceContext";
import type { BaseAgentSummary } from "../workspaceRepository";

export function AgentsPage() {
  const { snapshot } = useBaseWorkspace();
  const activeAgents = snapshot.agents.filter(({ status }) => status !== "Idle");
  const providerCount = new Set(snapshot.agents.map(({ provider }) => provider)).size;
  const waitingCount = snapshot.agents.filter(({ status }) => status === "Waiting").length;

  return (
    <BasePageShell
      actions={
        <Button render={<Link to="/" />} size="sm">
          <TerminalIcon />
          Open agent workspace
          <ArrowRightIcon />
        </Button>
      }
      description="See which provider sessions are working, what they own, and where human input is holding execution."
      title="Agents"
    >
      <div className="grid grid-cols-2 gap-y-5 border-b border-border/60 pb-5 [&>*:nth-child(2)]:border-r-0 [&>*:nth-child(3)]:pl-0 lg:grid-cols-4 lg:gap-y-0 lg:[&>*:nth-child(2)]:border-r lg:[&>*:nth-child(3)]:pl-4">
        <BaseMetricCard
          detail={`${snapshot.agents.length} configured sessions`}
          label="Active"
          tone="info"
          value={String(activeAgents.length)}
        />
        <BaseMetricCard
          detail="Connected runtimes"
          label="Providers"
          value={String(providerCount)}
        />
        <BaseMetricCard
          detail="Executing an operation"
          label="Running"
          tone="success"
          value={String(snapshot.agents.filter(({ status }) => status === "Running").length)}
        />
        <BaseMetricCard
          detail="Needs human input"
          label="Waiting"
          tone={waitingCount > 0 ? "warning" : "neutral"}
          value={String(waitingCount)}
        />
      </div>

      <BasePanel
        className="mt-5"
        description="Provider-backed sessions currently available to this workspace."
        title="Provider sessions"
      >
        <div className="hidden grid-cols-[minmax(180px,1.1fr)_100px_90px_160px_minmax(220px,1.5fr)_80px] gap-x-3 border-b border-border/60 bg-muted/20 px-3.5 py-2 text-[9px] font-semibold uppercase tracking-[0.11em] text-muted-foreground/60 xl:grid">
          <span>Agent / session</span>
          <span>Provider</span>
          <span>Status</span>
          <span>Issue</span>
          <span>Operation</span>
          <span className="text-right">Duration</span>
        </div>

        <div className="divide-y divide-border/60">
          {snapshot.agents.map((agent) => {
            const issue = snapshot.issues.find(({ id }) => id === agent.issueId) ?? null;

            return (
              <div
                className="grid grid-cols-2 gap-x-4 gap-y-3 px-3.5 py-3 sm:grid-cols-3 xl:grid-cols-[minmax(180px,1.1fr)_100px_90px_160px_minmax(220px,1.5fr)_80px] xl:items-center xl:gap-x-3"
                key={agent.id}
              >
                <AgentField className="col-span-2 sm:col-span-1" label="Agent / session">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background/65 text-muted-foreground">
                      <BotIcon className="size-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-foreground">{agent.name}</p>
                      <p className="mt-0.5 truncate font-mono text-[9px] text-muted-foreground/65">
                        {agent.id}
                      </p>
                    </div>
                  </div>
                </AgentField>

                <AgentField label="Provider">
                  <Badge size="sm" variant="outline">
                    {agent.provider}
                  </Badge>
                </AgentField>

                <AgentField label="Status">
                  <AgentStatusBadge status={agent.status} />
                </AgentField>

                <AgentField className="col-span-2 sm:col-span-1" label="Issue">
                  {issue ? (
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[10px] font-medium text-foreground">
                        {issue.identifier}
                      </span>
                      <IssueStatusBadge status={issue.status} />
                    </div>
                  ) : (
                    <span className="text-[11px] text-muted-foreground/60">No issue assigned</span>
                  )}
                </AgentField>

                <AgentField className="col-span-2 sm:col-span-1" label="Operation">
                  <p className="truncate text-[11px] text-foreground/80">{agent.operation}</p>
                </AgentField>

                <AgentField className="col-span-2 sm:col-span-1" label="Duration">
                  <p className="font-mono text-[10px] tabular-nums text-muted-foreground xl:text-right">
                    {agent.duration}
                  </p>
                </AgentField>
              </div>
            );
          })}
        </div>
      </BasePanel>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-[10px] text-muted-foreground/65">
        <span>Session status is synchronized with the active workflow run.</span>
        <Button render={<Link to="/" />} size="xs" variant="ghost">
          Continue in agent workspace
          <ArrowRightIcon />
        </Button>
      </div>
    </BasePageShell>
  );
}

function AgentField({
  children,
  className,
  label,
}: {
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly label: string;
}) {
  return (
    <div className={className}>
      <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/55 xl:hidden">
        {label}
      </p>
      {children}
    </div>
  );
}

function AgentStatusBadge({ status }: { readonly status: BaseAgentSummary["status"] }) {
  return (
    <Badge
      size="sm"
      variant={status === "Running" ? "info" : status === "Waiting" ? "warning" : "secondary"}
    >
      <span className="size-1 rounded-full bg-current opacity-70" />
      {status}
    </Badge>
  );
}

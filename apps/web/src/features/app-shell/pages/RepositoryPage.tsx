import { Link } from "@tanstack/react-router";
import {
  ArrowRightIcon,
  CircleCheckIcon,
  FolderGit2Icon,
  GitBranchIcon,
  GitCommitIcon,
  TerminalIcon,
  TriangleAlertIcon,
  WrenchIcon,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

import { BaseMetricCard, BasePageShell, BasePanel } from "../BasePageShell";
import { useBaseWorkspace } from "../BaseWorkspaceContext";

const hookPreview = [
  { detail: "Completed in 3.4s", name: "vp check", status: "Passed" },
  { detail: "Completed in 6.8s", name: "vp run typecheck", status: "Passed" },
  { detail: "18 suites selected", name: "vp test", status: "Ready" },
  { detail: "Required before push", name: "Branch ownership", status: "Warning" },
] as const;

export function RepositoryPage() {
  const { selectedRepository, snapshot } = useBaseWorkspace();
  const runningAgent = snapshot.agents.find(({ status }) => status === "Running") ?? null;
  const waitingAgent = snapshot.agents.find(({ status }) => status === "Waiting") ?? null;
  const runningIssue = snapshot.issues.find(({ id }) => id === runningAgent?.issueId) ?? null;
  const reviewIssue = snapshot.issues.find(({ id }) => id === waitingAgent?.issueId) ?? null;
  const linkedRun = snapshot.runs.find(({ issueId }) => issueId === runningIssue?.id) ?? null;

  const branches = [
    {
      detail: "Default · protected",
      name: selectedRepository.defaultBranch,
      state: "Clean",
      tone: "success" as const,
    },
    {
      detail: linkedRun ? `${linkedRun.id} · ${linkedRun.duration}` : "Active agent work",
      name: runningIssue
        ? `codex/${runningIssue.identifier.toLowerCase()}-worktree`
        : "codex/active-worktree",
      state: "Active",
      tone: "info" as const,
    },
    {
      detail: reviewIssue ? `${reviewIssue.identifier} · awaiting review` : "Awaiting review",
      name: reviewIssue ? `review/${reviewIssue.identifier.toLowerCase()}` : "review/pending",
      state: "Review",
      tone: "warning" as const,
    },
  ];

  const worktrees = [
    {
      detail: `Human checkout · ${selectedRepository.defaultBranch}`,
      name: "Workspace root",
      path: "~/Projects/kiso-labs/base",
    },
    {
      detail: runningAgent ? `${runningAgent.name} · ${runningAgent.duration}` : "Agent available",
      name: runningIssue?.identifier ?? "Active agent",
      path: runningIssue
        ? `.worktrees/${runningIssue.identifier.toLowerCase()}`
        : ".worktrees/active",
    },
    {
      detail: waitingAgent ? `${waitingAgent.name} · waiting` : "Review worktree",
      name: reviewIssue?.identifier ?? "Review",
      path: reviewIssue
        ? `.worktrees/${reviewIssue.identifier.toLowerCase()}`
        : ".worktrees/review",
    },
  ];

  const commits = [
    {
      hash: "7c2e4a1",
      message: "Guard worktree ownership before provider start",
      meta: runningIssue ? `${runningIssue.identifier} · 4 min ago` : "4 min ago",
    },
    {
      hash: "0fd91ba",
      message: "Record agent session against workflow run",
      meta: "Implementation Agent · 11 min ago",
    },
    {
      hash: "a84d2f0",
      message: "Refine failed-run timeline grouping",
      meta: reviewIssue ? `${reviewIssue.identifier} · 28 min ago` : "28 min ago",
    },
  ];

  return (
    <BasePageShell
      actions={
        <Button render={<Link to="/" />} size="sm" variant="outline">
          <TerminalIcon />
          Open workspace
          <ArrowRightIcon />
        </Button>
      }
      description="Inspect the selected repository, isolated worktrees, recent changes, and checks that guard agent execution."
      title="Repository"
    >
      <div className="grid grid-cols-2 gap-y-5 border-b border-border/60 pb-5 [&>*:nth-child(2)]:border-r-0 [&>*:nth-child(3)]:pl-0 lg:grid-cols-4 lg:gap-y-0 lg:[&>*:nth-child(2)]:border-r lg:[&>*:nth-child(3)]:pl-4">
        <BaseMetricCard
          detail="Runtime and remote available"
          label="Environment"
          tone="success"
          value="Healthy"
        />
        <BaseMetricCard detail="1 human · 2 agent" label="Worktrees" value="3" />
        <BaseMetricCard detail="2 agent-owned" label="Branches" tone="info" value="3" />
        <BaseMetricCard detail="One policy warning" label="Hooks" tone="warning" value="3 / 4" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <BasePanel title="Selected repository">
          <div className="grid gap-4 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(180px,0.55fr)]">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background/70 text-muted-foreground">
                  <FolderGit2Icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {selectedRepository.fullName}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                    {selectedRepository.remoteUrl}
                  </p>
                </div>
              </div>
            </div>
            <div className="border-t border-border/60 pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
              <p className="text-[9px] font-semibold uppercase tracking-[0.11em] text-muted-foreground/60">
                Default branch
              </p>
              <div className="mt-2 flex items-center gap-2">
                <GitBranchIcon className="size-3.5 text-muted-foreground" />
                <span className="font-mono text-xs text-foreground">
                  {selectedRepository.defaultBranch}
                </span>
                <Badge size="sm" variant="success">
                  Protected
                </Badge>
              </div>
            </div>
          </div>
        </BasePanel>

        <BasePanel title="Environment health">
          <div className="grid grid-cols-2 divide-x divide-y divide-border/60 [&>*:nth-child(3)]:border-l-0">
            <HealthCheck detail="Node 24 · pnpm 11" label="Runtime" />
            <HealthCheck detail="Reachable · 42 ms" label="Git remote" />
            <HealthCheck detail="Providers 3 / 3" label="Agent runtimes" />
            <HealthCheck detail="Workspace root clean" label="Local state" />
          </div>
        </BasePanel>
      </div>

      <Alert className="mt-4 rounded-lg" variant="warning">
        <TriangleAlertIcon />
        <AlertTitle>Branch ownership conflict prevented</AlertTitle>
        <AlertDescription>
          {runningIssue && runningAgent ? (
            <span>
              <code className="font-mono text-[11px]">
                codex/{runningIssue.identifier.toLowerCase()}-worktree
              </code>{" "}
              is reserved by {runningAgent.name}. A second agent must use a new isolated worktree.
            </span>
          ) : (
            <span>An agent-owned branch must be released before another session can claim it.</span>
          )}
        </AlertDescription>
      </Alert>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <BasePanel description="Tracked local and agent-owned branches." title="Branches">
          <div className="divide-y divide-border/60">
            {branches.map((branch) => (
              <RepositoryRow
                icon={<GitBranchIcon />}
                key={branch.name}
                meta={branch.detail}
                title={branch.name}
              >
                <Badge size="sm" variant={branch.tone}>
                  {branch.state}
                </Badge>
              </RepositoryRow>
            ))}
          </div>
        </BasePanel>

        <BasePanel description="Checkouts isolated by owner and issue." title="Worktrees">
          <div className="divide-y divide-border/60">
            {worktrees.map((worktree) => (
              <RepositoryRow
                icon={<FolderGit2Icon />}
                key={worktree.path}
                meta={worktree.detail}
                title={worktree.name}
              >
                <code className="max-w-52 truncate font-mono text-[9px] text-muted-foreground">
                  {worktree.path}
                </code>
              </RepositoryRow>
            ))}
          </div>
        </BasePanel>

        <BasePanel
          description="Latest local activity across active worktrees."
          title="Recent commits"
        >
          <div className="divide-y divide-border/60">
            {commits.map((commit) => (
              <RepositoryRow
                icon={<GitCommitIcon />}
                key={commit.hash}
                meta={commit.meta}
                title={commit.message}
              >
                <code className="font-mono text-[10px] text-muted-foreground">{commit.hash}</code>
              </RepositoryRow>
            ))}
          </div>
        </BasePanel>

        <BasePanel description="Pre-flight checks for the active branch." title="Hook preview">
          <div className="divide-y divide-border/60">
            {hookPreview.map((hook) => (
              <RepositoryRow
                icon={<WrenchIcon />}
                key={hook.name}
                meta={hook.detail}
                title={hook.name}
              >
                <Badge
                  size="sm"
                  variant={
                    hook.status === "Passed"
                      ? "success"
                      : hook.status === "Warning"
                        ? "warning"
                        : "secondary"
                  }
                >
                  {hook.status}
                </Badge>
              </RepositoryRow>
            ))}
          </div>
        </BasePanel>
      </div>

      <p className="mt-3 px-1 text-[10px] text-muted-foreground/65">
        Preview data updates when repository runtime events are connected.
      </p>
    </BasePageShell>
  );
}

function HealthCheck({ detail, label }: { readonly detail: string; readonly label: string }) {
  return (
    <div className="flex min-w-0 items-start gap-2 px-3 py-3">
      <CircleCheckIcon className="mt-0.5 size-3.5 shrink-0 text-success" />
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium text-foreground">{label}</p>
        <p className="mt-0.5 truncate text-[9px] text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

function RepositoryRow({
  children,
  icon,
  meta,
  title,
}: {
  readonly children: React.ReactNode;
  readonly icon: React.ReactNode;
  readonly meta: string;
  readonly title: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 px-3.5 py-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background/60 text-muted-foreground [&>svg]:size-3.5">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-medium text-foreground">{title}</p>
        <p className="mt-0.5 truncate text-[9px] text-muted-foreground">{meta}</p>
      </div>
      <div className="flex min-w-0 shrink-0 items-center">{children}</div>
    </div>
  );
}

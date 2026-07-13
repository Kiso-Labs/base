import {
  ActivityIcon,
  GitBranchIcon,
  ListChecksIcon,
  PlayIcon,
  SaveIcon,
  WorkflowIcon,
  XIcon,
} from "lucide-react";
import { useState, type FormEvent } from "react";

import { RightPanelSheet } from "~/components/RightPanelSheet";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPanel,
  SheetTitle,
} from "~/components/ui/sheet";
import { Textarea } from "~/components/ui/textarea";
import { toastManager } from "~/components/ui/toast";

import { IssueStatusBadge, PriorityLabel } from "./BaseEntityPills";
import { useBaseWorkspace } from "./BaseWorkspaceContext";
import { IssuePropertySelect } from "./IssuePropertySelect";
import { useIssueWorkspaceStore } from "./issueWorkspaceStore";
import {
  BASE_ISSUE_STATUSES,
  BASE_PRIORITIES,
  type BaseIssueStatus,
  type BaseIssueSummary,
  type BasePriority,
} from "./workspaceRepository";

export function IssueInspector() {
  const selectedIssueId = useIssueWorkspaceStore((state) => state.selectedIssueId);
  const issue = useIssueWorkspaceStore((state) =>
    state.issues.find(({ id }) => id === selectedIssueId),
  );
  const selectIssue = useIssueWorkspaceStore((state) => state.selectIssue);

  const close = () => {
    const issueId = selectedIssueId;
    selectIssue(null);
    if (!issueId) return;
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`[data-issue-id="${issueId}"]`)?.focus();
    });
  };

  return (
    <RightPanelSheet onClose={close} open={Boolean(issue)}>
      {issue ? <IssueInspectorPanel issue={issue} key={issue.id} onClose={close} /> : null}
    </RightPanelSheet>
  );
}

function IssueInspectorPanel({
  issue,
  onClose,
}: {
  readonly issue: BaseIssueSummary;
  readonly onClose: () => void;
}) {
  const { selectedProject, selectedRepository, snapshot } = useBaseWorkspace();
  const updateIssue = useIssueWorkspaceStore((state) => state.updateIssue);
  const assignWorkflow = useIssueWorkspaceStore((state) => state.assignWorkflow);
  const transitionIssue = useIssueWorkspaceStore((state) => state.transitionIssue);
  const queueIssues = useIssueWorkspaceStore((state) => state.queueIssues);
  const dequeueIssue = useIssueWorkspaceStore((state) => state.dequeueIssue);
  const [title, setTitle] = useState(issue.title);
  const [description, setDescription] = useState(issue.description);
  const [priority, setPriority] = useState<BasePriority>(issue.priority);
  const [labels, setLabels] = useState(issue.labels.join(", "));
  const [module, setModule] = useState(issue.module);
  const [cycle, setCycle] = useState(issue.cycle);
  const [assignee, setAssignee] = useState(issue.assignee);
  const [branch, setBranch] = useState(issue.branch);
  const latestRun = snapshot.runs.find(
    (run) => run.id === issue.latestRunId && run.projectId === selectedProject.id,
  );
  const dependencies = issue.dependencies.flatMap((dependencyId) => {
    const dependency = snapshot.issues.find(({ id }) => id === dependencyId);
    return dependency ? [dependency] : [];
  });
  const workflowOptions = [
    { label: "No workflow", value: "none" },
    ...snapshot.workflows.map((workflow) => ({ label: workflow.name, value: workflow.id })),
  ];

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = updateIssue(issue.id, {
      title,
      description,
      priority,
      labels: labels.split(","),
      module,
      cycle,
      assignee,
      branch,
    });
    toastManager.add(
      result.ok
        ? {
            type: "success",
            title: `${issue.identifier} updated`,
            description: "Issue properties were saved to this project.",
          }
        : { type: "error", title: "Could not update issue", description: result.reason },
    );
  };

  const setStatus = (nextStatus: string) => {
    let result;
    if (nextStatus === "Queued") {
      const queueResult = queueIssues([issue.id]);
      const rejection = queueResult.rejected[0];
      if (rejection) {
        toastManager.add({
          type: "error",
          title: "Could not queue issue",
          description: rejection.reason,
        });
        return;
      }
      toastManager.add({
        type: "success",
        title: `${issue.identifier} queued`,
        description: "A project-scoped run was created from the assigned workflow template.",
      });
      return;
    }
    if (issue.status === "Queued" && nextStatus === "Ready") {
      result = dequeueIssue(issue.id);
    } else {
      result = transitionIssue(issue.id, nextStatus as BaseIssueStatus);
    }
    toastManager.add(
      result.ok
        ? {
            type: "success",
            title: `${issue.identifier} moved to ${nextStatus}`,
            description: "The project issue view has been updated.",
          }
        : { type: "error", title: "Transition blocked", description: result.reason },
    );
  };

  const setWorkflow = (workflowId: string) => {
    const result = assignWorkflow(issue.id, workflowId === "none" ? null : workflowId);
    toastManager.add(
      result.ok
        ? {
            type: "success",
            title: "Workflow template updated",
            description: "The assignment applies only to this project issue.",
          }
        : { type: "error", title: "Could not change workflow", description: result.reason },
    );
  };

  const queueOrDequeue = () => {
    if (issue.status === "Queued") {
      const result = dequeueIssue(issue.id);
      toastManager.add(
        result.ok
          ? {
              type: "success",
              title: `${issue.identifier} dequeued`,
              description: "The issue returned to Ready and its run remains in project history.",
            }
          : { type: "error", title: "Could not dequeue issue", description: result.reason },
      );
      return;
    }
    const result = queueIssues([issue.id]);
    const rejection = result.rejected[0];
    toastManager.add(
      rejection
        ? { type: "error", title: "Could not queue issue", description: rejection.reason }
        : {
            type: "success",
            title: `${issue.identifier} queued`,
            description: "A new run was added to this project.",
          },
    );
  };
  const queueAction =
    issue.status === "Queued"
      ? { disabled: false, label: "Dequeue" }
      : issue.status === "Running"
        ? { disabled: true, label: "Run in progress" }
        : !issue.workflowId
          ? { disabled: true, label: "Assign workflow to run" }
          : issue.status !== "Ready"
            ? { disabled: true, label: "Move to Ready to run" }
            : { disabled: false, label: "Queue for execution" };

  return (
    <>
      <SheetHeader className="border-b border-border/60 px-5 py-4">
        <div className="flex items-start justify-between gap-3 pr-8">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] font-semibold text-muted-foreground">
                {issue.identifier}
              </span>
              <IssueStatusBadge status={issue.status} />
              <PriorityLabel priority={issue.priority} />
            </div>
            <SheetTitle className="mt-2 truncate text-base">{issue.title}</SheetTitle>
            <SheetDescription className="mt-1 text-xs">
              {selectedProject.name} · {selectedRepository.fullName}
            </SheetDescription>
          </div>
          <Button
            aria-label="Close issue inspector"
            onClick={onClose}
            size="icon-xs"
            variant="ghost"
          >
            <XIcon />
          </Button>
        </div>
      </SheetHeader>

      <SheetPanel className="space-y-5 px-5 py-4">
        <form className="space-y-4" id={`issue-form-${issue.id}`} onSubmit={save}>
          <div className="space-y-1.5">
            <Label className="sr-only" htmlFor={`${issue.id}-title`}>
              Title
            </Label>
            <Input
              className="h-10 border-0 bg-transparent px-0 text-base font-medium shadow-none focus-visible:ring-0"
              id={`${issue.id}-title`}
              onChange={(event) => setTitle(event.currentTarget.value)}
              value={title}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="sr-only" htmlFor={`${issue.id}-description`}>
              Description
            </Label>
            <Textarea
              className="min-h-28 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              id={`${issue.id}-description`}
              onChange={(event) => setDescription(event.currentTarget.value)}
              placeholder="Add context or acceptance criteria…"
              value={description}
            />
          </div>

          <div className="grid gap-3 rounded-lg border border-border/60 bg-muted/15 p-3 sm:grid-cols-2">
            <IssuePropertySelect
              label="Status"
              onValueChange={setStatus}
              options={BASE_ISSUE_STATUSES.map((status) => ({ label: status, value: status }))}
              value={issue.status}
            />
            <IssuePropertySelect
              label="Priority"
              onValueChange={(value) => setPriority(value as BasePriority)}
              options={BASE_PRIORITIES.map((value) => ({ label: value, value }))}
              value={priority}
            />
            <IssuePropertySelect
              disabled={issue.status === "Queued" || issue.status === "Running"}
              label="Workflow template"
              onValueChange={setWorkflow}
              options={workflowOptions}
              value={issue.workflowId ?? "none"}
            />
            <IssueTextProperty label="Assignee" onChange={setAssignee} value={assignee} />
            <IssueTextProperty label="Module" onChange={setModule} value={module} />
            <IssueTextProperty label="Cycle" onChange={setCycle} value={cycle} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${issue.id}-labels`}>Labels</Label>
            <Input
              id={`${issue.id}-labels`}
              onChange={(event) => setLabels(event.currentTarget.value)}
              placeholder="bug, frontend"
              value={labels}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${issue.id}-branch`}>Target branch</Label>
            <div className="relative">
              <GitBranchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8 font-mono text-xs"
                id={`${issue.id}-branch`}
                onChange={(event) => setBranch(event.currentTarget.value)}
                value={branch}
              />
            </div>
          </div>
        </form>

        <InspectorSection icon={<WorkflowIcon />} title="Workflow and execution">
          {issue.workflowId ? (
            <p className="text-xs text-foreground/80">
              {snapshot.workflows.find(({ id }) => id === issue.workflowId)?.name ??
                "Unknown template"}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">No reusable workflow template assigned.</p>
          )}
          {latestRun ? (
            <div className="mt-2 rounded-md border border-border/60 bg-muted/20 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] font-semibold">{latestRun.id}</span>
                <Badge size="sm" variant="outline">
                  {latestRun.status}
                </Badge>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{latestRun.currentStep}</p>
              <p className="mt-1 font-mono text-[9px] text-muted-foreground/70">
                Project run · {latestRun.startedAt}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-[11px] text-muted-foreground/70">No runs for this issue.</p>
          )}
        </InspectorSection>

        <InspectorSection icon={<ListChecksIcon />} title="Dependencies">
          {dependencies.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {dependencies.map((dependency) => (
                <Badge key={dependency.id} size="sm" variant="outline">
                  {dependency.identifier} · {dependency.status}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No blocking dependencies.</p>
          )}
        </InspectorSection>

        <InspectorSection icon={<ActivityIcon />} title="Activity">
          <ol className="space-y-2">
            {[...issue.activity].toReversed().map((entry) => (
              <li className="flex items-start justify-between gap-3 text-xs" key={entry.id}>
                <span className="text-foreground/80">{entry.label}</span>
                <span className="shrink-0 font-mono text-[9px] text-muted-foreground">
                  {entry.createdAt}
                </span>
              </li>
            ))}
          </ol>
        </InspectorSection>
      </SheetPanel>

      <SheetFooter className="px-5">
        <Button
          disabled={queueAction.disabled}
          onClick={queueOrDequeue}
          title={queueAction.label}
          type="button"
          variant="outline"
        >
          <PlayIcon />
          {queueAction.label}
        </Button>
        <Button form={`issue-form-${issue.id}`} type="submit">
          <SaveIcon />
          Save issue
        </Button>
      </SheetFooter>
    </>
  );
}

function IssueTextProperty({
  label,
  onChange,
  value,
}: {
  readonly label: string;
  readonly onChange: (value: string) => void;
  readonly value: string;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-medium text-foreground">{label}</span>
      <Input onChange={(event) => onChange(event.currentTarget.value)} value={value} />
    </label>
  );
}

function InspectorSection({
  children,
  icon,
  title,
}: {
  readonly children: React.ReactNode;
  readonly icon: React.ReactNode;
  readonly title: string;
}) {
  return (
    <section className="border-t border-border/60 pt-4">
      <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground">
        <span className="text-muted-foreground [&_svg]:size-3.5">{icon}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}

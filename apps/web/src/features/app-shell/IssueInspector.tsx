import {
  ActivityIcon,
  CircleDashedIcon,
  EllipsisIcon,
  GitBranchIcon,
  ListChecksIcon,
  PlayIcon,
  SaveIcon,
  SignalIcon,
  TagIcon,
  UserRoundIcon,
  WorkflowIcon,
} from "lucide-react";
import { useState, type FormEvent } from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Dialog, DialogPopup } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { toastManager } from "~/components/ui/toast";

import { useBaseWorkspace } from "./BaseWorkspaceContext";
import {
  IssueDialogActions,
  IssueDialogForm,
  IssuePropertyBar,
  IssuePropertyButton,
} from "./IssueDialogForm";
import { IssueDialogHeader } from "./IssueDialogHeader";
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
    <Dialog
      onOpenChange={(open) => {
        if (!open) close();
      }}
      open={Boolean(issue)}
    >
      <DialogPopup className="h-[min(46rem,calc(100dvh-2rem))] max-w-5xl overflow-hidden p-0">
        {issue ? <IssueInspectorPanel issue={issue} key={issue.id} /> : null}
      </DialogPopup>
    </Dialog>
  );
}

function IssueInspectorPanel({ issue }: { readonly issue: BaseIssueSummary }) {
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
  const [showMoreFields, setShowMoreFields] = useState(false);
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
      <IssueDialogHeader
        description={`Edit ${issue.identifier} in ${selectedProject.name} · ${selectedRepository.fullName}.`}
        label={issue.identifier}
        projectIdentifier={selectedProject.identifier}
        projectName={selectedProject.name}
      />

      <IssueDialogForm
        description={description}
        descriptionId={`${issue.id}-description`}
        formId={`issue-form-${issue.id}`}
        onDescriptionChange={setDescription}
        onSubmit={save}
        onTitleChange={setTitle}
        title={title}
        titleId={`${issue.id}-title`}
      >
        <IssuePropertyBar>
          <IssuePropertySelect
            icon={<CircleDashedIcon />}
            label="Status"
            onValueChange={setStatus}
            options={BASE_ISSUE_STATUSES.map((status) => ({ label: status, value: status }))}
            size="sm"
            value={issue.status}
            variant="pill"
          />
          <IssuePropertySelect
            icon={<SignalIcon />}
            label="Priority"
            onValueChange={(value) => setPriority(value as BasePriority)}
            options={BASE_PRIORITIES.map((value) => ({ label: value, value }))}
            size="sm"
            value={priority}
            variant="pill"
          />
          <IssuePropertyButton
            accessibleLabel="Edit assignee"
            icon={<UserRoundIcon />}
            onClick={() => setShowMoreFields(true)}
          >
            {assignee.trim() && assignee !== "Unassigned" ? assignee : "Assignee"}
          </IssuePropertyButton>
          <IssuePropertyButton
            accessibleLabel="Edit labels"
            icon={<TagIcon />}
            onClick={() => setShowMoreFields(true)}
          >
            {labels.trim() || "Labels"}
          </IssuePropertyButton>
          <Button
            aria-expanded={showMoreFields}
            aria-label="More issue fields and activity"
            className="rounded-full"
            onClick={() => setShowMoreFields((visible) => !visible)}
            size="icon-sm"
            type="button"
            variant="outline"
          >
            <EllipsisIcon />
          </Button>
        </IssuePropertyBar>

        {showMoreFields ? (
          <div className="mt-5 rounded-xl border border-border/60 bg-muted/15 p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
              <div className="space-y-1.5">
                <Label htmlFor={`${issue.id}-labels`}>Labels</Label>
                <Input
                  id={`${issue.id}-labels`}
                  onChange={(event) => setLabels(event.currentTarget.value)}
                  placeholder="bug, frontend"
                  value={labels}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
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
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-3">
              <InspectorSection icon={<WorkflowIcon />} title="Workflow and execution">
                {issue.workflowId ? (
                  <p className="text-xs text-foreground/80">
                    {snapshot.workflows.find(({ id }) => id === issue.workflowId)?.name ??
                      "Unknown template"}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No reusable workflow template assigned.
                  </p>
                )}
                {latestRun ? (
                  <div className="mt-2 rounded-md border border-border/60 bg-background/70 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] font-semibold">{latestRun.id}</span>
                      <Badge size="sm" variant="outline">
                        {latestRun.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {latestRun.currentStep}
                    </p>
                    <p className="mt-1 font-mono text-[9px] text-muted-foreground/70">
                      Project run · {latestRun.startedAt}
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] text-muted-foreground/70">
                    No runs for this issue.
                  </p>
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
            </div>
          </div>
        ) : null}
      </IssueDialogForm>

      <IssueDialogActions>
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
          <span className="ml-1 font-mono text-[9px] opacity-65">⌘↵</span>
        </Button>
      </IssueDialogActions>
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

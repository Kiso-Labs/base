import {
  ActivityIcon,
  CheckIcon,
  GitBranchIcon,
  ListChecksIcon,
  PlayIcon,
  PlusIcon,
  SaveIcon,
  SearchIcon,
  WorkflowIcon,
  XIcon,
} from "lucide-react";
import { useState, type FormEvent } from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Popover, PopoverPopup, PopoverTrigger } from "~/components/ui/popover";
import { Sheet, SheetPopup } from "~/components/ui/sheet";
import { toastManager } from "~/components/ui/toast";
import { cn } from "~/lib/utils";

import { useBaseWorkspace } from "./BaseWorkspaceContext";
import { IssueDialogActions, IssueCorePropertyBar, IssueDialogForm } from "./IssueDialogForm";
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
    <Sheet
      onOpenChange={(open) => {
        if (!open) close();
      }}
      open={Boolean(issue)}
    >
      <SheetPopup
        className="max-w-[46rem] overflow-hidden border-l-border/70 bg-background/98 shadow-2xl"
        side="right"
      >
        {issue ? <IssueInspectorPanel issue={issue} key={issue.id} /> : null}
      </SheetPopup>
    </Sheet>
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
  const projectIssues = snapshot.issues.filter(
    (candidate) => candidate.projectId === issue.projectId && candidate.id !== issue.id,
  );
  const eligibleDependencyIds = new Set(projectIssues.map(({ id }) => id));
  const [dependencyIds, setDependencyIds] = useState(
    issue.dependencies.filter((dependencyId) => eligibleDependencyIds.has(dependencyId)),
  );
  const [showMoreFields, setShowMoreFields] = useState(true);
  const latestRun = snapshot.runs.find(
    (run) => run.id === issue.latestRunId && run.projectId === selectedProject.id,
  );
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
      dependencies: dependencyIds,
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
        <IssueCorePropertyBar
          assignee={assignee}
          expanded={showMoreFields}
          labels={labels}
          moreAccessibleLabel="More issue fields and activity"
          onExpand={() => setShowMoreFields(true)}
          onPriorityChange={(value) => setPriority(value as BasePriority)}
          onStatusChange={setStatus}
          onToggleMore={() => setShowMoreFields((visible) => !visible)}
          priority={priority}
          priorityOptions={BASE_PRIORITIES.map((value) => ({ label: value, value }))}
          status={issue.status}
          statusOptions={BASE_ISSUE_STATUSES.map((status) => ({ label: status, value: status }))}
        />

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
                <IssueDependencyPicker
                  issues={projectIssues}
                  onChange={setDependencyIds}
                  value={dependencyIds}
                />
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

function IssueDependencyPicker({
  issues,
  onChange,
  value,
}: {
  readonly issues: readonly BaseIssueSummary[];
  readonly onChange: (issueIds: string[]) => void;
  readonly value: readonly string[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selectedIds = new Set(value);
  const selectedIssues = value.flatMap((issueId) => {
    const dependency = issues.find(({ id }) => id === issueId);
    return dependency ? [dependency] : [];
  });
  const normalizedSearch = search.trim().toLowerCase();
  const matchingIssues = issues.filter(
    (candidate) =>
      !normalizedSearch ||
      candidate.identifier.toLowerCase().includes(normalizedSearch) ||
      candidate.title.toLowerCase().includes(normalizedSearch),
  );

  const toggleDependency = (issueId: string) => {
    onChange(
      selectedIds.has(issueId)
        ? value.filter((candidate) => candidate !== issueId)
        : [...value, issueId],
    );
  };

  return (
    <div className="space-y-2.5">
      {selectedIssues.length > 0 ? (
        <div className="space-y-1.5">
          {selectedIssues.map((dependency) => (
            <div
              className="group flex items-center gap-2 rounded-lg border border-border/60 bg-background/70 px-2.5 py-2"
              key={dependency.id}
            >
              <span className="font-mono text-[10px] font-semibold text-muted-foreground">
                {dependency.identifier}
              </span>
              <span className="min-w-0 flex-1 truncate text-[11px] text-foreground/85">
                {dependency.title}
              </span>
              <Badge className="shrink-0" size="sm" variant="outline">
                {dependency.status}
              </Badge>
              <Button
                aria-label={`Remove dependency ${dependency.identifier}`}
                className="size-6 shrink-0 text-muted-foreground opacity-70 group-hover:opacity-100"
                onClick={() => toggleDependency(dependency.id)}
                size="icon-xs"
                type="button"
                variant="ghost"
              >
                <XIcon />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No blocking dependencies.</p>
      )}

      <Popover
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setSearch("");
        }}
        open={open}
      >
        <PopoverTrigger render={<Button size="xs" type="button" variant="outline" />}>
          <PlusIcon />
          Add project issue
        </PopoverTrigger>
        <PopoverPopup align="start" className="w-[min(26rem,calc(100vw-4rem))] p-0" sideOffset={6}>
          <div className="border-b border-border/60 p-2.5">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search project issues"
                autoFocus
                className="h-8 pl-8 text-xs"
                onChange={(event) => setSearch(event.currentTarget.value)}
                placeholder="Search this project…"
                value={search}
              />
            </div>
          </div>
          <div
            aria-label="Project issue dependencies"
            aria-multiselectable="true"
            className="max-h-64 overflow-y-auto p-1.5"
            role="listbox"
          >
            {matchingIssues.map((candidate) => {
              const selected = selectedIds.has(candidate.id);
              return (
                <button
                  aria-selected={selected}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
                  key={candidate.id}
                  onClick={() => toggleDependency(candidate.id)}
                  role="option"
                  type="button"
                >
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded border",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background",
                    )}
                  >
                    {selected ? <CheckIcon className="size-3" /> : null}
                  </span>
                  <span className="w-16 shrink-0 font-mono text-[10px] font-semibold text-muted-foreground">
                    {candidate.identifier}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-foreground/85">
                    {candidate.title}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {candidate.status}
                  </span>
                </button>
              );
            })}
            {matchingIssues.length === 0 ? (
              <div className="px-3 py-8 text-center text-xs text-muted-foreground">
                {issues.length === 0
                  ? "There are no other issues in this project."
                  : "No project issues match that search."}
              </div>
            ) : null}
          </div>
        </PopoverPopup>
      </Popover>
      <p className="text-[10px] leading-relaxed text-muted-foreground/70">
        Only issues from this project can be selected.
      </p>
    </div>
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

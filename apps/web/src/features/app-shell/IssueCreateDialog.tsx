import { LayoutTemplateIcon, PlusIcon } from "lucide-react";
import { useEffect, useId, useState, type FormEvent } from "react";

import { Button } from "~/components/ui/button";
import { Dialog, DialogPopup } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { toastManager } from "~/components/ui/toast";

import { useBaseWorkspace } from "./BaseWorkspaceContext";
import { BASE_ISSUE_TEMPLATES, applyIssueTemplate, type IssueDraft } from "./issueRepository";
import { IssueDialogActions, IssueCorePropertyBar, IssueDialogForm } from "./IssueDialogForm";
import { IssueDialogHeader } from "./IssueDialogHeader";
import { useIssueWorkspaceStore } from "./issueWorkspaceStore";
import { IssuePropertySelect } from "./IssuePropertySelect";
import { BASE_PRIORITIES, type BasePriority } from "./workspaceRepository";
import type { BaseIssueStatus } from "./workspaceRepository";

export function IssueCreateDialog({
  initialStatus = "Backlog",
  onOpenChange,
  open,
}: {
  readonly initialStatus?: "Backlog" | "Planned" | "Ready";
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
}) {
  const formId = useId();
  const { selectedProject, selectedRepository, snapshot } = useBaseWorkspace();
  const createIssue = useIssueWorkspaceStore((state) => state.createIssue);
  const uiIntent = useIssueWorkspaceStore((state) => state.uiIntent);
  const consumeUiIntent = useIssueWorkspaceStore((state) => state.consumeUiIntent);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<BaseIssueStatus>(initialStatus);
  const [priority, setPriority] = useState<BasePriority>("None");
  const [labels, setLabels] = useState("");
  const [module, setModule] = useState("");
  const [cycle, setCycle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [workflowId, setWorkflowId] = useState("none");
  const [selectedTemplateId, setSelectedTemplateId] = useState("blank");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [showMoreFields, setShowMoreFields] = useState(false);

  useEffect(() => {
    if (uiIntent?.type !== "create" || uiIntent.projectId !== selectedProject.id) return;
    onOpenChange(true);
    consumeUiIntent(uiIntent.id);
  }, [consumeUiIntent, onOpenChange, selectedProject.id, uiIntent]);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setDescription("");
    setStatus(initialStatus);
    setPriority("None");
    setLabels("");
    setModule("");
    setCycle("");
    setAssignee("");
    setWorkflowId("none");
    setSelectedTemplateId("blank");
    setTitleError(null);
    setShowMoreFields(false);
  }, [initialStatus, open]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      setTitleError("Add a title before creating the issue.");
      return;
    }
    const issue = createIssue({
      project: selectedProject,
      repository: selectedRepository,
      title,
      status,
      description,
      priority,
      labels: labels.split(","),
      module,
      cycle,
      assignee,
      workflowId: workflowId === "none" ? null : workflowId,
    });
    toastManager.add({
      type: "success",
      title: `${issue.identifier} created`,
      description: `The issue was added to ${selectedProject.name} in ${status}.`,
    });
    onOpenChange(false);
  };

  const workflowOptions = [
    { label: "No workflow", value: "none" },
    ...snapshot.workflows.map((workflow) => ({ label: workflow.name, value: workflow.id })),
  ];

  const chooseTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (templateId === "blank") return;
    const template = BASE_ISSUE_TEMPLATES.find(({ id }) => id === templateId);
    if (!template) return;
    const nextDraft = applyIssueTemplate(
      {
        title,
        description,
        status: status as IssueDraft["status"],
        priority,
        labels: labels
          .split(",")
          .map((label) => label.trim())
          .filter(Boolean),
        module,
        cycle,
        assignee,
        workflowId: workflowId === "none" ? null : workflowId,
      },
      template,
    );
    setDescription(nextDraft.description);
    setStatus(nextDraft.status);
    setPriority(nextDraft.priority);
    setLabels(nextDraft.labels.join(", "));
    setModule(nextDraft.module);
    setCycle(nextDraft.cycle);
    setAssignee(nextDraft.assignee);
    setWorkflowId(nextDraft.workflowId ?? "none");
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogPopup className="h-[min(46rem,calc(100dvh-2rem))] max-w-5xl overflow-hidden p-0">
        <IssueDialogHeader
          description={`Create an issue in ${selectedProject.name}.`}
          label="New issue"
          projectIdentifier={selectedProject.identifier}
          projectName={selectedProject.name}
        />
        <IssueDialogForm
          autoFocusTitle
          description={description}
          descriptionId={`${formId}-description`}
          formId={formId}
          onDescriptionChange={setDescription}
          onSubmit={submit}
          onTitleChange={(value) => {
            setTitle(value);
            if (titleError) setTitleError(null);
          }}
          title={title}
          titleError={titleError}
          titleId={`${formId}-title`}
        >
          <IssueCorePropertyBar
            assignee={assignee}
            expanded={showMoreFields}
            labels={labels}
            moreAccessibleLabel="More issue fields"
            onExpand={() => setShowMoreFields(true)}
            onPriorityChange={(value) => setPriority(value as BasePriority)}
            onStatusChange={(value) => setStatus(value as BaseIssueStatus)}
            onToggleMore={() => setShowMoreFields((visible) => !visible)}
            priority={priority}
            priorityOptions={BASE_PRIORITIES.map((value) => ({ label: value, value }))}
            status={status}
            statusOptions={[
              { label: "Backlog", value: "Backlog" },
              { label: "Planned", value: "Planned" },
              { label: "Ready", value: "Ready" },
            ]}
          />

          {showMoreFields ? (
            <div className="mt-5 rounded-xl border border-border/60 bg-muted/15 p-4">
              <div className="mb-4 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <LayoutTemplateIcon className="size-3.5" />
                Start from a template
              </div>
              <div className="grid gap-2 sm:grid-cols-4">
                <TemplateButton
                  active={selectedTemplateId === "blank"}
                  detail="Start clean"
                  label="Blank issue"
                  onClick={() => chooseTemplate("blank")}
                />
                {BASE_ISSUE_TEMPLATES.map((template) => (
                  <TemplateButton
                    active={selectedTemplateId === template.id}
                    detail={`${template.defaults.priority} · ${template.defaults.status}`}
                    key={template.id}
                    label={template.name}
                    onClick={() => chooseTemplate(template.id)}
                    title={template.description}
                  />
                ))}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <IssuePropertySelect
                  label="Workflow template"
                  onValueChange={setWorkflowId}
                  options={workflowOptions}
                  value={workflowId}
                />
                <IssueTextProperty
                  label="Assignee"
                  onChange={setAssignee}
                  placeholder="Unassigned"
                  value={assignee}
                />
                <IssueTextProperty
                  label="Labels"
                  onChange={setLabels}
                  placeholder="bug, frontend"
                  value={labels}
                />
                <IssueTextProperty
                  label="Module"
                  onChange={setModule}
                  placeholder="Unassigned"
                  value={module}
                />
                <IssueTextProperty
                  label="Cycle"
                  onChange={setCycle}
                  placeholder="Unscheduled"
                  value={cycle}
                />
              </div>
            </div>
          ) : null}
        </IssueDialogForm>
        <IssueDialogActions>
          <Button onClick={() => onOpenChange(false)} type="button" variant="ghost">
            Cancel
          </Button>
          <Button form={formId} type="submit">
            <PlusIcon />
            Create issue
            <span className="ml-1 font-mono text-[9px] opacity-65">⌘↵</span>
          </Button>
        </IssueDialogActions>
      </DialogPopup>
    </Dialog>
  );
}

function TemplateButton({
  active,
  detail,
  label,
  onClick,
  title,
}: {
  readonly active: boolean;
  readonly detail: string;
  readonly label: string;
  readonly onClick: () => void;
  readonly title?: string;
}) {
  return (
    <button
      className="rounded-lg border border-border/70 bg-background px-3 py-2 text-left transition-colors hover:bg-muted/50 data-[active=true]:border-primary/50 data-[active=true]:bg-primary/5"
      data-active={active}
      onClick={onClick}
      title={title}
      type="button"
    >
      <span className="block truncate text-xs font-medium">{label}</span>
      <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">{detail}</span>
    </button>
  );
}

function IssueTextProperty({
  label,
  onChange,
  placeholder,
  value,
}: {
  readonly label: string;
  readonly onChange: (value: string) => void;
  readonly placeholder: string;
  readonly value: string;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-medium text-foreground">{label}</span>
      <Input
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

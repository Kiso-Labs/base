import { LayoutTemplateIcon, PlusIcon } from "lucide-react";
import { useEffect, useId, useState, type FormEvent } from "react";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { toastManager } from "~/components/ui/toast";

import { useBaseWorkspace } from "./BaseWorkspaceContext";
import { BASE_ISSUE_TEMPLATES, applyIssueTemplate, type IssueDraft } from "./issueRepository";
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
      <DialogPopup className="max-w-2xl overflow-hidden p-0">
        <DialogHeader className="px-5 pb-4 pt-5">
          <DialogTitle className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 font-mono text-[10px] font-bold text-primary">
              {selectedProject.identifier}
            </span>
            Create issue
          </DialogTitle>
          <DialogDescription>
            Add work to {selectedProject.name}. It starts in {status} and stays attached to this
            project.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel className="space-y-0 p-0">
          <div className="border-y border-border/60 bg-muted/20 px-5 py-3">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              <LayoutTemplateIcon className="size-3" />
              Start from a template
            </div>
            <div className="grid gap-2 sm:grid-cols-4">
              <button
                className="rounded-md border border-border/70 bg-background px-3 py-2 text-left transition-colors hover:bg-muted/50 data-[active=true]:border-primary/50 data-[active=true]:bg-primary/5"
                data-active={selectedTemplateId === "blank"}
                onClick={() => chooseTemplate("blank")}
                type="button"
              >
                <span className="block text-xs font-medium">Blank issue</span>
                <span className="mt-0.5 block text-[9px] text-muted-foreground">Start clean</span>
              </button>
              {BASE_ISSUE_TEMPLATES.map((template) => (
                <button
                  className="rounded-md border border-border/70 bg-background px-3 py-2 text-left transition-colors hover:bg-muted/50 data-[active=true]:border-primary/50 data-[active=true]:bg-primary/5"
                  data-active={selectedTemplateId === template.id}
                  key={template.id}
                  onClick={() => chooseTemplate(template.id)}
                  title={template.description}
                  type="button"
                >
                  <span className="block truncate text-xs font-medium">{template.name}</span>
                  <span className="mt-0.5 block truncate text-[9px] text-muted-foreground">
                    {template.defaults.priority} · {template.defaults.status}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <form
            className="space-y-4 px-5 py-4"
            id={formId}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.requestSubmit();
              }
            }}
            onSubmit={submit}
          >
            <div className="space-y-1.5">
              <Label className="sr-only" htmlFor={`${formId}-title`}>
                Title
              </Label>
              <Input
                aria-invalid={titleError ? true : undefined}
                autoFocus
                className="h-11 border-0 bg-transparent px-0 text-lg font-medium shadow-none focus-visible:ring-0"
                id={`${formId}-title`}
                onChange={(event) => {
                  setTitle(event.currentTarget.value);
                  if (titleError) setTitleError(null);
                }}
                placeholder="What needs to be done?"
                value={title}
              />
              {titleError ? (
                <p className="text-xs text-destructive-foreground">{titleError}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label className="sr-only" htmlFor={`${formId}-description`}>
                Description
              </Label>
              <Textarea
                className="min-h-32 resize-y border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                id={`${formId}-description`}
                onChange={(event) => setDescription(event.currentTarget.value)}
                placeholder="Add context, constraints, or acceptance criteria…"
                value={description}
              />
            </div>
            <div className="grid gap-3 rounded-lg border border-border/60 bg-muted/15 p-3 sm:grid-cols-2">
              <IssuePropertySelect
                label="Status"
                onValueChange={(value) => setStatus(value as BaseIssueStatus)}
                options={[
                  { label: "Backlog", value: "Backlog" },
                  { label: "Planned", value: "Planned" },
                  { label: "Ready", value: "Ready" },
                ]}
                value={status}
              />
              <IssuePropertySelect
                label="Priority"
                onValueChange={(value) => setPriority(value as BasePriority)}
                options={BASE_PRIORITIES.map((value) => ({ label: value, value }))}
                value={priority}
              />
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
          </form>
        </DialogPanel>
        <DialogFooter className="border-t border-border/60 bg-muted/15 px-5 py-3">
          <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
            Cancel
          </Button>
          <Button form={formId} type="submit">
            <PlusIcon />
            Create issue
            <span className="ml-1 font-mono text-[9px] opacity-65">⌘↵</span>
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
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

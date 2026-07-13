import { useNavigate } from "@tanstack/react-router";
import {
  BookmarkPlusIcon,
  Layers3Icon,
  LibraryBigIcon,
  PlayIcon,
  SparklesIcon,
} from "lucide-react";
import { useId, useState, type FormEvent } from "react";

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
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { toastManager } from "~/components/ui/toast";

import { useBaseWorkspace } from "./BaseWorkspaceContext";
import { IssueFilterBar } from "./IssueFilterBar";
import { IssueViewToggle } from "./IssueViewToggle";
import { DEFAULT_ISSUE_FILTERS, type IssueViewGroupBy } from "./issueRepository";
import { useIssueWorkspaceStore } from "./issueWorkspaceStore";

const GROUP_OPTIONS: readonly { readonly label: string; readonly value: IssueViewGroupBy }[] = [
  { label: "No grouping", value: "none" },
  { label: "Status", value: "status" },
  { label: "Priority", value: "priority" },
  { label: "Assignee", value: "assignee" },
  { label: "Workflow", value: "workflow" },
  { label: "Module", value: "module" },
  { label: "Cycle", value: "cycle" },
];

export function ProjectIssueViewBar({
  layout,
  onRunView,
  visibleIssueIds,
}: {
  readonly layout: "list" | "board";
  readonly onRunView: (issueIds: readonly string[]) => void;
  readonly visibleIssueIds: readonly string[];
}) {
  const navigate = useNavigate();
  const { selectedProject } = useBaseWorkspace();
  const views = useIssueWorkspaceStore((state) => state.views);
  const filters = useIssueWorkspaceStore(
    (state) => state.filtersByProject[selectedProject.id] ?? DEFAULT_ISSUE_FILTERS,
  );
  const groupBy = useIssueWorkspaceStore(
    (state) => state.groupByByProject[selectedProject.id] ?? "none",
  );
  const activeViewId = useIssueWorkspaceStore(
    (state) => state.activeViewIdByProject[selectedProject.id] ?? null,
  );
  const activateView = useIssueWorkspaceStore((state) => state.activateView);
  const setGroupBy = useIssueWorkspaceStore((state) => state.setGroupBy);
  const saveView = useIssueWorkspaceStore((state) => state.saveView);
  const [saveOpen, setSaveOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const projectViews = views.filter(({ projectId }) => projectId === selectedProject.id);
  const activeView = projectViews.find(({ id }) => id === activeViewId);
  const projectViewOptions = [
    ...(activeViewId === null ? [{ label: "Unsaved view", value: "custom" }] : []),
    ...projectViews.map((view) => ({ label: view.name, value: view.id })),
  ];

  const openView = (viewId: string) => {
    if (viewId === "custom") return;
    const view = activateView(selectedProject.id, viewId);
    if (!view) return;
    void navigate({ to: view.layout === "board" ? "/board" : "/issues" });
  };

  const createView = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const saved = saveView({
      projectId: selectedProject.id,
      name: viewName,
      layout,
      groupBy: layout === "board" ? "status" : groupBy,
      filters,
    });
    setViewName("");
    setSaveOpen(false);
    toastManager.add({
      type: "success",
      title: `${saved.name} saved`,
      description: "This view stays connected to the project issue collection.",
    });
  };

  return (
    <>
      <div className="divide-y divide-border/50 border-b border-border/60 bg-background">
        <div className="flex min-h-10 flex-wrap items-center gap-2 px-3.5 py-1.5">
          <div className="flex min-w-0 items-center gap-2">
            <LibraryBigIcon className="size-3.5 text-muted-foreground" />
            <Select
              items={projectViewOptions}
              onValueChange={(value) => value && openView(value)}
              value={activeViewId ?? "custom"}
            >
              <SelectTrigger
                aria-label="Issue view"
                className="w-44 border-0 bg-transparent px-1.5 shadow-none"
                size="sm"
              >
                <SelectValue>{activeView?.name ?? "Unsaved view"}</SelectValue>
              </SelectTrigger>
              <SelectPopup>
                {activeViewId === null ? (
                  <SelectItem value="custom">Unsaved view</SelectItem>
                ) : null}
                {projectViews.map((view) => (
                  <SelectItem key={view.id} value={view.id}>
                    <span className="flex items-center gap-2">
                      {view.kind === "system" ? (
                        <SparklesIcon className="size-3 text-muted-foreground" />
                      ) : (
                        <BookmarkPlusIcon className="size-3 text-muted-foreground" />
                      )}
                      {view.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
            <span className="hidden text-[10px] text-muted-foreground sm:inline">
              {visibleIssueIds.length} issue{visibleIssueIds.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-1">
            <IssueViewToggle />
            {layout === "list" ? (
              <Select
                items={GROUP_OPTIONS}
                onValueChange={(value) => value && setGroupBy(selectedProject.id, value)}
                value={groupBy}
              >
                <SelectTrigger aria-label="Group issues" className="w-36" size="sm" variant="ghost">
                  <Layers3Icon className="size-3" />
                  <SelectValue>
                    {GROUP_OPTIONS.find(({ value }) => value === groupBy)?.label ?? "Group"}
                  </SelectValue>
                </SelectTrigger>
                <SelectPopup>
                  {GROUP_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            ) : null}
            <Button onClick={() => setSaveOpen(true)} size="xs" variant="ghost">
              <BookmarkPlusIcon />
              Save view
            </Button>
            <Button
              disabled={visibleIssueIds.length === 0}
              onClick={() => onRunView(visibleIssueIds)}
              size="xs"
              variant="outline"
            >
              <PlayIcon />
              Run workflow
              <span className="font-mono text-[9px] text-muted-foreground">⇧Q</span>
            </Button>
          </div>
        </div>
        <div className="flex min-h-10 items-center px-3.5 py-1.5">
          <IssueFilterBar />
        </div>
      </div>

      <SaveViewDialog
        name={viewName}
        onNameChange={setViewName}
        onOpenChange={setSaveOpen}
        onSubmit={createView}
        open={saveOpen}
        projectName={selectedProject.name}
      />
    </>
  );
}

function SaveViewDialog({
  name,
  onNameChange,
  onOpenChange,
  onSubmit,
  open,
  projectName,
}: {
  readonly name: string;
  readonly onNameChange: (name: string) => void;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly open: boolean;
  readonly projectName: string;
}) {
  const formId = useId();
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>Save project view</DialogTitle>
          <DialogDescription>
            Save these filters and grouping as a live view of {projectName} issues.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <form id={formId} onSubmit={onSubmit}>
            <Label htmlFor={`${formId}-name`}>View name</Label>
            <Input
              autoFocus
              className="mt-1.5"
              id={`${formId}-name`}
              onChange={(event) => onNameChange(event.currentTarget.value)}
              placeholder="e.g. Release blockers"
              value={name}
            />
          </form>
        </DialogPanel>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
            Cancel
          </Button>
          <Button disabled={!name.trim()} form={formId} type="submit">
            Save view
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

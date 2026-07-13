import { useNavigate } from "@tanstack/react-router";
import {
  CalendarDaysIcon,
  ChevronDownIcon,
  CircleIcon,
  ExternalLinkIcon,
  Layers3Icon,
  MegaphoneIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SlidersHorizontalIcon,
  StarIcon,
  UsersIcon,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Popover, PopoverPopup, PopoverTrigger } from "~/components/ui/popover";
import { toastManager } from "~/components/ui/toast";
import { cn } from "~/lib/utils";

import { BasePageShell } from "../BasePageShell";
import { useBaseWorkspace } from "../BaseWorkspaceContext";
import { IssueFilterBar } from "../IssueFilterBar";
import {
  DEFAULT_ISSUE_FILTERS,
  filterIssues,
  hasActiveIssueFilters,
  type BaseIssueView,
  type IssueViewGroupBy,
  type IssueViewLayout,
} from "../issueRepository";
import { useIssueWorkspaceStore } from "../issueWorkspaceStore";
import type { BaseIssueStatus, BaseIssueSummary } from "../workspaceRepository";

type ViewCollection = "issues" | "projects";
type ViewsMode = "create" | "list";

const GROUP_OPTIONS: readonly { readonly label: string; readonly value: IssueViewGroupBy }[] = [
  { label: "No grouping", value: "none" },
  { label: "Status", value: "status" },
  { label: "Priority", value: "priority" },
  { label: "Assignee", value: "assignee" },
  { label: "Workflow", value: "workflow" },
  { label: "Module", value: "module" },
  { label: "Cycle", value: "cycle" },
];

const STATUS_CLASS_NAME: Readonly<Record<BaseIssueStatus, string>> = {
  Backlog: "border-muted-foreground/60",
  Planned: "border-primary/55",
  Ready: "border-success/75",
  Queued: "border-warning/80",
  Running: "border-info/80",
  Blocked: "border-destructive/80",
  Review: "border-primary/80",
  Done: "border-success/80 bg-success/15",
};

function CollectionTabs({
  collection,
  onCollectionChange,
}: {
  readonly collection: ViewCollection;
  readonly onCollectionChange: (collection: ViewCollection) => void;
}) {
  return (
    <div className="flex items-center gap-1.5" role="tablist" aria-label="View collection">
      {(["issues", "projects"] as const).map((value) => (
        <button
          aria-selected={collection === value}
          className={cn(
            "h-7 rounded-full border px-3 text-xs font-medium capitalize outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
            collection === value
              ? "border-border bg-muted text-foreground"
              : "border-border/45 bg-transparent text-muted-foreground hover:bg-muted/45 hover:text-foreground",
          )}
          key={value}
          onClick={() => onCollectionChange(value)}
          role="tab"
          type="button"
        >
          {value}
        </button>
      ))}
    </div>
  );
}

function ViewListRow({
  onOpen,
  ownerName,
  view,
}: {
  readonly onOpen: () => void;
  readonly ownerName: string;
  readonly view: BaseIssueView;
}) {
  const initials = ownerName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toLocaleUpperCase();

  return (
    <button
      className="group grid min-h-16 w-full grid-cols-[minmax(0,1fr)_minmax(11rem,15%)] items-center rounded-lg bg-muted/30 px-4 text-left outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      onClick={onOpen}
      type="button"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground">
          <Layers3Icon className="size-4 fill-muted-foreground/15" />
        </span>
        <span className="truncate text-sm font-medium text-foreground/90">{view.name}</span>
        {view.kind === "saved" ? (
          <span className="rounded-full border border-border/55 px-1.5 py-0.5 text-[9px] text-muted-foreground">
            Saved
          </span>
        ) : null}
      </span>
      <span className="flex min-w-0 items-center gap-2 text-sm text-foreground/80">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted text-[8px] font-semibold text-muted-foreground">
          {initials}
        </span>
        <span className="truncate">{ownerName}</span>
      </span>
    </button>
  );
}

function ViewsList({ onCreate }: { readonly onCreate: () => void }) {
  const navigate = useNavigate();
  const { selectedProject, snapshot } = useBaseWorkspace();
  const views = useIssueWorkspaceStore((state) => state.views);
  const activateView = useIssueWorkspaceStore((state) => state.activateView);
  const [collection, setCollection] = useState<ViewCollection>("issues");
  const [showOnlySaved, setShowOnlySaved] = useState(false);
  const projectViews = views.filter(
    (view) => view.projectId === selectedProject.id && (!showOnlySaved || view.kind === "saved"),
  );

  const openView = (view: BaseIssueView) => {
    activateView(selectedProject.id, view.id);
    void navigate({ to: view.layout === "board" ? "/board" : "/issues" });
  };

  return (
    <BasePageShell
      density="canvas"
      description="Create, manage, and open saved project views."
      headerActions={
        <Button aria-label="Create view" onClick={onCreate} size="icon-xs" variant="ghost">
          <PlusIcon className="size-4" />
        </Button>
      }
      headerIcon={<MegaphoneIcon className="size-3.5 text-info" />}
      headerTitleAccessory={
        <Button aria-label="Favorite views" size="icon-xs" variant="ghost">
          <StarIcon className="size-3.5" />
        </Button>
      }
      minimalHeader
      showIntro={false}
      title="Views"
    >
      <section className="m-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/55 bg-background">
        <div className="flex min-h-12 items-center justify-between border-b border-border/45 px-3">
          <CollectionTabs collection={collection} onCollectionChange={setCollection} />
          <Button
            aria-label={showOnlySaved ? "Show all views" : "Show saved views only"}
            aria-pressed={showOnlySaved}
            className="rounded-full"
            onClick={() => setShowOnlySaved((current) => !current)}
            size="icon-sm"
            variant={showOnlySaved ? "secondary" : "ghost"}
          >
            <SlidersHorizontalIcon className="size-3.5" />
          </Button>
        </div>

        {collection === "issues" ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
            <div className="grid h-10 grid-cols-[minmax(0,1fr)_minmax(11rem,15%)] items-center px-3 text-xs text-muted-foreground">
              <span>Name ↓</span>
              <span>Owner</span>
            </div>
            <div className="space-y-1" role="list" aria-label="Issue views">
              {projectViews.map((view) => (
                <ViewListRow
                  key={view.id}
                  onOpen={() => openView(view)}
                  ownerName={snapshot.workspace.name}
                  view={view}
                />
              ))}
            </div>
            {projectViews.length === 0 ? (
              <div className="flex min-h-40 flex-col items-center justify-center text-center">
                <Layers3Icon className="size-5 text-muted-foreground/45" />
                <p className="mt-3 text-sm font-medium">No saved views yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Create a view to keep a useful issue setup close at hand.
                </p>
                <Button className="mt-4" onClick={onCreate} size="sm" variant="outline">
                  <PlusIcon />
                  Create view
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
            <Layers3Icon className="size-5 text-muted-foreground/45" />
            <p className="mt-3 text-sm font-medium">Project views are coming next</p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              This workspace currently stores issue views. Project-level view definitions will
              appear here when they are available.
            </p>
          </div>
        )}
      </section>
    </BasePageShell>
  );
}

function PreviewIssueRow({ issue }: { readonly issue: BaseIssueSummary }) {
  return (
    <div className="group grid min-h-12 grid-cols-[1.5rem_4rem_minmax(0,1fr)_auto] items-center gap-2 border-b border-border/35 px-3 last:border-b-0 hover:bg-muted/25">
      <MoreHorizontalIcon className="size-3.5 text-muted-foreground/45" />
      <span className="truncate font-mono text-[11px] text-muted-foreground/75">
        {issue.identifier}
      </span>
      <span className="flex min-w-0 items-center gap-2">
        <CircleIcon
          className={cn("size-4 shrink-0 stroke-[2.25]", STATUS_CLASS_NAME[issue.status])}
        />
        <span className="truncate text-sm font-medium text-foreground/90">{issue.title}</span>
      </span>
      <span className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="hidden items-center gap-1.5 sm:flex">
          <UsersIcon className="size-4 opacity-60" />
          <span className="max-w-24 truncate">{issue.assignee}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <CalendarDaysIcon className="size-4 opacity-60" />
          {issue.updatedAt}
        </span>
      </span>
    </div>
  );
}

function ViewDisplaySettings({
  groupBy,
  layout,
  onGroupByChange,
  onLayoutChange,
}: {
  readonly groupBy: IssueViewGroupBy;
  readonly layout: IssueViewLayout;
  readonly onGroupByChange: (groupBy: IssueViewGroupBy) => void;
  readonly onLayoutChange: (layout: IssueViewLayout) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger
        render={<Button aria-label="View display settings" size="icon-sm" variant="ghost" />}
      >
        <SlidersHorizontalIcon className="size-3.5" />
      </PopoverTrigger>
      <PopoverPopup align="end" className="w-56" sideOffset={6}>
        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Layout
            </p>
            <div className="mt-2 grid grid-cols-2 gap-1">
              {(["list", "board"] as const).map((value) => (
                <Button
                  key={value}
                  onClick={() => onLayoutChange(value)}
                  size="xs"
                  variant={layout === value ? "secondary" : "ghost"}
                >
                  <span className="capitalize">{value}</span>
                </Button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Group by
            </span>
            <select
              className="mt-2 h-8 w-full rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
              onChange={(event) => onGroupByChange(event.currentTarget.value as IssueViewGroupBy)}
              value={groupBy}
            >
              {GROUP_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </PopoverPopup>
    </Popover>
  );
}

function ViewCreation({ onCancel }: { readonly onCancel: () => void }) {
  const navigate = useNavigate();
  const { selectedProject, snapshot } = useBaseWorkspace();
  const filters = useIssueWorkspaceStore(
    (state) => state.filtersByProject[selectedProject.id] ?? DEFAULT_ISSUE_FILTERS,
  );
  const saveView = useIssueWorkspaceStore((state) => state.saveView);
  const activateView = useIssueWorkspaceStore((state) => state.activateView);
  const [collection, setCollection] = useState<ViewCollection>("issues");
  const [description, setDescription] = useState("");
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [groupBy, setGroupBy] = useState<IssueViewGroupBy>("status");
  const [layout, setLayout] = useState<IssueViewLayout>("list");
  const [name, setName] = useState("All issues");
  const visibleIssues = useMemo(
    () =>
      filterIssues(snapshot.issues, selectedProject.id, filters).filter(
        (issue) => issue.status !== "Done",
      ),
    [filters, selectedProject.id, snapshot.issues],
  );
  const activeFilters = hasActiveIssueFilters(filters);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const saved = saveView({
      projectId: selectedProject.id,
      name,
      layout,
      groupBy: layout === "board" ? "status" : groupBy,
      filters,
    });
    onCancel();
    toastManager.add({
      type: "success",
      title: "Your view was successfully created.",
      description: description.trim() || undefined,
      data: {
        secondaryActionProps: {
          children: "Open view",
          onClick: () => {
            activateView(selectedProject.id, saved.id);
            void navigate({ to: saved.layout === "board" ? "/board" : "/issues" });
          },
        },
        secondaryActionVariant: "ghost",
      },
    });
  };

  return (
    <form className="contents" onSubmit={submit}>
      <BasePageShell
        density="canvas"
        description="Choose the issue setup this view should preserve."
        headerActions={
          <Button aria-label="Copy view link" size="icon-xs" variant="ghost">
            <ExternalLinkIcon className="size-3.5" />
          </Button>
        }
        headerIcon={<MegaphoneIcon className="size-3.5 text-info" />}
        minimalHeader
        showIntro={false}
        title={name.trim() || "All issues"}
      >
        <section className="m-1 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/55 bg-background">
          <div className="border-b border-border/50 bg-muted/15">
            <div className="flex min-h-28 flex-wrap items-start justify-between gap-6 px-4 py-4">
              <div className="flex min-w-[18rem] flex-1 gap-3">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Layers3Icon className="size-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <Input
                    aria-label="View name"
                    autoFocus
                    className="h-8 border-0 bg-transparent px-0 text-base font-semibold shadow-none focus-visible:ring-0"
                    onChange={(event) => setName(event.currentTarget.value)}
                    placeholder="View name"
                    value={name}
                  />
                  <Input
                    aria-label="View description"
                    className="h-8 border-0 bg-transparent px-0 text-sm text-muted-foreground shadow-none focus-visible:ring-0"
                    onChange={(event) => setDescription(event.currentTarget.value)}
                    placeholder="Description (optional)"
                    value={description}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <span className="hidden text-xs text-muted-foreground sm:inline">Save to</span>
                <span className="flex h-7 items-center gap-1.5 rounded-full border border-border/60 bg-muted/55 px-2.5 text-xs font-medium">
                  <MegaphoneIcon className="size-3 text-info" />
                  {selectedProject.name}
                </span>
                <Button onClick={onCancel} size="sm" variant="ghost">
                  Cancel
                </Button>
                <Button
                  disabled={name.trim().length === 0 || collection !== "issues"}
                  size="sm"
                  type="submit"
                >
                  Save
                </Button>
              </div>
            </div>

            <div className="flex min-h-12 items-center justify-between border-t border-border/45 px-3">
              <CollectionTabs collection={collection} onCollectionChange={setCollection} />
              <div className="flex items-center gap-1">
                <Button
                  aria-expanded={filtersVisible}
                  className="rounded-full"
                  onClick={() => setFiltersVisible((current) => !current)}
                  size="icon-sm"
                  type="button"
                  variant={filtersVisible || activeFilters ? "secondary" : "ghost"}
                >
                  <span className="relative">
                    <SlidersHorizontalIcon className="size-3.5" />
                    {activeFilters ? (
                      <span className="absolute -right-1 -top-1 size-1.5 rounded-full bg-primary" />
                    ) : null}
                  </span>
                </Button>
                <ViewDisplaySettings
                  groupBy={groupBy}
                  layout={layout}
                  onGroupByChange={setGroupBy}
                  onLayoutChange={setLayout}
                />
              </div>
            </div>
            {filtersVisible ? (
              <div className="border-t border-border/45 px-3 py-2">
                <IssueFilterBar />
              </div>
            ) : null}
          </div>

          {collection === "issues" ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="flex h-11 items-center gap-2 bg-muted/25 px-4">
                <ChevronDownIcon className="size-3.5 text-muted-foreground/60" />
                <CircleIcon className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">Todo</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {visibleIssues.length}
                </span>
                <PlusIcon className="ml-auto size-3.5 text-muted-foreground" />
              </div>
              <div role="list" aria-label="View issue preview">
                {visibleIssues.map((issue) => (
                  <PreviewIssueRow issue={issue} key={issue.id} />
                ))}
              </div>
              {visibleIssues.length === 0 ? (
                <div className="flex min-h-36 items-center justify-center px-6 text-center text-xs text-muted-foreground">
                  No issues match the current filters.
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-center text-xs text-muted-foreground">
              Project views are not available in this workspace yet.
            </div>
          )}
        </section>
      </BasePageShell>
    </form>
  );
}

export function ViewsPage() {
  const [mode, setMode] = useState<ViewsMode>("list");

  return mode === "create" ? (
    <ViewCreation onCancel={() => setMode("list")} />
  ) : (
    <ViewsList onCreate={() => setMode("create")} />
  );
}

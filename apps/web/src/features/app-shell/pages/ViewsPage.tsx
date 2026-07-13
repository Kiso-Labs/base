import { useUser } from "@clerk/react";
import { useNavigate } from "@tanstack/react-router";
import {
  CalendarDaysIcon,
  ChevronDownIcon,
  CircleIcon,
  Layers3Icon,
  LinkIcon,
  MegaphoneIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SlidersHorizontalIcon,
  StarIcon,
  UsersIcon,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import { Button } from "~/components/ui/button";
import { hasCloudPublicConfig } from "~/cloud/publicConfig";
import { Input } from "~/components/ui/input";
import { toastManager } from "~/components/ui/toast";
import { cn } from "~/lib/utils";

import { BasePageShell } from "../BasePageShell";
import { useBaseWorkspace } from "../BaseWorkspaceContext";
import {
  DEFAULT_ISSUE_FILTERS,
  filterIssues,
  groupIssues,
  issueViewPath,
  type BaseIssueView,
  type IssueGroup,
  type IssueViewGroupBy,
  type IssueViewLayout,
} from "../issueRepository";
import { useIssueWorkspaceStore } from "../issueWorkspaceStore";
import { IssueViewFilterPopover } from "../IssueViewFilterPopover";
import { ViewDisplaySettingsPopover } from "../ViewDisplaySettingsPopover";
import { type BaseIssueStatus, type BaseIssueSummary } from "../workspaceRepository";

type ViewCollection = "issues" | "projects";
type ViewsMode = "create" | "list";

const STATUS_CLASS_NAME: Readonly<Record<BaseIssueStatus, string>> = {
  Backlog: "text-muted-foreground/60",
  Planned: "text-primary/55",
  Ready: "text-success/75",
  Queued: "text-warning/80",
  Running: "text-info/80",
  Blocked: "text-destructive/80",
  Review: "text-primary/80",
  Done: "fill-success/15 text-success/80",
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

function OwnerPresentation({
  imageUrl,
  name,
}: {
  readonly imageUrl?: string;
  readonly name: string;
}) {
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toLocaleUpperCase();

  return (
    <span className="flex min-w-0 items-center gap-2 text-sm text-foreground/80">
      {imageUrl ? (
        <img alt="" className="size-5 shrink-0 rounded-full object-cover" src={imageUrl} />
      ) : (
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted text-[8px] font-semibold text-muted-foreground">
          {initials}
        </span>
      )}
      <span className="truncate">{name}</span>
    </span>
  );
}

function ConfiguredViewOwner() {
  const { isLoaded, user } = useUser();
  if (!isLoaded || !user) return <OwnerPresentation name="You" />;

  return (
    <OwnerPresentation imageUrl={user.imageUrl} name={user.fullName ?? user.firstName ?? "You"} />
  );
}

function ViewOwner() {
  return hasCloudPublicConfig() ? <ConfiguredViewOwner /> : <OwnerPresentation name="You" />;
}

function ViewListRow({
  onOpen,
  view,
}: {
  readonly onOpen: () => void;
  readonly view: BaseIssueView;
}) {
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
      </span>
      <ViewOwner />
    </button>
  );
}

function ViewsList({ onCreate }: { readonly onCreate: () => void }) {
  const navigate = useNavigate();
  const { selectedProject } = useBaseWorkspace();
  const views = useIssueWorkspaceStore((state) => state.views);
  const activateView = useIssueWorkspaceStore((state) => state.activateView);
  const [collection, setCollection] = useState<ViewCollection>("issues");
  const [favorite, setFavorite] = useState(false);
  const [showOnlySaved, setShowOnlySaved] = useState(false);
  const savedViewNames = new Set(
    views
      .filter((view) => view.projectId === selectedProject.id && view.kind === "saved")
      .map((view) => view.name.trim().toLocaleLowerCase()),
  );
  const projectViews = views.filter((view) => {
    if (view.projectId !== selectedProject.id) return false;
    if (showOnlySaved) return view.kind === "saved";
    if (view.kind === "saved") return true;
    return (
      view.id === `view-${selectedProject.id}-all` &&
      !savedViewNames.has(view.name.trim().toLocaleLowerCase())
    );
  });

  const openView = (view: BaseIssueView) => {
    const activatedView = activateView(selectedProject.id, view.id);
    if (!activatedView) return;
    void navigate({ to: issueViewPath(activatedView.layout) });
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
        <Button
          aria-label={favorite ? "Remove views from favorites" : "Favorite views"}
          aria-pressed={favorite}
          onClick={() => setFavorite((current) => !current)}
          size="icon-xs"
          variant="ghost"
        >
          <StarIcon className={cn("size-3.5", favorite && "fill-current text-warning")} />
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
                  view={view.name === "All issues" ? { ...view, name: "all" } : view}
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

function PreviewBoard({ groups }: { readonly groups: readonly IssueGroup[] }) {
  return (
    <div
      className="flex min-h-full items-start gap-3 overflow-x-auto p-3"
      aria-label="Board preview"
    >
      {groups.map((group) => (
        <section className="w-64 shrink-0" key={group.key}>
          <div className="flex h-9 items-center gap-2 px-1 text-sm font-medium">
            <CircleIcon className="size-4 text-muted-foreground" />
            <span>{group.key}</span>
            <span className="font-mono text-xs text-muted-foreground">{group.issues.length}</span>
            <PlusIcon className="ml-auto size-3.5 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            {group.issues.map((issue) => (
              <article
                className="rounded-lg border border-border/55 bg-muted/20 p-3 text-sm shadow-xs"
                key={issue.id}
              >
                <span className="font-mono text-[10px] text-muted-foreground">
                  {issue.identifier}
                </span>
                <p className="mt-1 font-medium text-foreground/90">{issue.title}</p>
                <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{issue.priority}</span>
                  <span>{issue.assignee}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
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
  const [groupBy, setGroupBy] = useState<IssueViewGroupBy>("status");
  const [layout, setLayout] = useState<IssueViewLayout>("list");
  const [name, setName] = useState("All issues");
  const visibleIssues = useMemo(
    () => filterIssues(snapshot.issues, selectedProject.id, filters),
    [filters, selectedProject.id, snapshot.issues],
  );
  const previewGroups = useMemo(
    () => groupIssues(visibleIssues, layout === "board" ? "status" : groupBy),
    [groupBy, layout, visibleIssues],
  );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const saved = saveView({
      projectId: selectedProject.id,
      name,
      description: description.trim(),
      layout,
      groupBy: layout === "board" ? "status" : groupBy,
      filters,
    });
    onCancel();
    toastManager.add({
      type: "success",
      title: "Your view was successfully created.",
      data: {
        secondaryActionProps: {
          children: "Open view",
          onClick: () => {
            const activatedView = activateView(selectedProject.id, saved.id);
            if (!activatedView) return;
            void navigate({ to: issueViewPath(activatedView.layout) });
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
          <Button
            aria-label="Copy view link"
            disabled
            size="icon-xs"
            title="Save the view before copying its link"
            variant="ghost"
          >
            <LinkIcon className="size-3.5" />
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
                <IssueViewFilterPopover />
                <ViewDisplaySettingsPopover
                  groupBy={groupBy}
                  layout={layout}
                  onGroupByChange={setGroupBy}
                  onLayoutChange={setLayout}
                />
              </div>
            </div>
          </div>

          {collection === "issues" ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              {layout === "board" ? (
                <PreviewBoard groups={previewGroups} />
              ) : (
                previewGroups.map((group) => (
                  <div key={group.key}>
                    <div className="flex h-11 items-center gap-2 bg-muted/25 px-4">
                      <ChevronDownIcon className="size-3.5 text-muted-foreground/60" />
                      <CircleIcon className="size-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {group.key === "All issues" ? "Todo" : group.key}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {group.issues.length}
                      </span>
                      <PlusIcon className="ml-auto size-3.5 text-muted-foreground" />
                    </div>
                    <div role="list" aria-label={`${group.key} issue preview`}>
                      {group.issues.map((issue) => (
                        <PreviewIssueRow issue={issue} key={issue.id} />
                      ))}
                    </div>
                  </div>
                ))
              )}
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

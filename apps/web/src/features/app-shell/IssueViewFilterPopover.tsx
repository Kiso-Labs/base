import {
  BellIcon,
  BoxIcon,
  BoxesIcon,
  CalendarRangeIcon,
  ChartNoAxesColumnIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleDashedIcon,
  CircleXIcon,
  FileTextIcon,
  FlagIcon,
  Link2Icon,
  ListFilterIcon,
  SearchIcon,
  TagIcon,
  TextCursorInputIcon,
  UserRoundIcon,
  WandSparklesIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { ComponentType } from "react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Popover, PopoverPopup, PopoverTrigger } from "~/components/ui/popover";
import { cn } from "~/lib/utils";

import { useBaseWorkspace } from "./BaseWorkspaceContext";
import { DEFAULT_ISSUE_FILTERS, hasActiveIssueFilters, type IssueFilters } from "./issueRepository";
import { useIssueWorkspaceStore } from "./issueWorkspaceStore";
import { BASE_ISSUE_STATUSES, BASE_PRIORITIES } from "./workspaceRepository";

type FilterSection = "issues" | "projects" | "other";
type SupportedFilterKey = "status" | "assignee" | "priority" | "label";

function AgentFilterIcon({ className }: { readonly className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5 4.5h10.5a3 3 0 0 1 3 3V12M5 4.5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="m13 11.5 8 3.2-3.4 1.2 1.8 3.7-2.2 1-1.7-3.7-2.5 2v-7.4Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

interface FilterMenuEntry {
  readonly disabledReason?: string;
  readonly filterKey?: SupportedFilterKey;
  readonly icon: ComponentType<{ readonly className?: string }>;
  readonly label: string;
  readonly section: FilterSection;
}

interface UtilityPanel {
  readonly label: string;
  readonly message: string;
}

type FilterPanel = FilterMenuEntry | UtilityPanel;

const FILTER_MENU_ENTRIES: readonly FilterMenuEntry[] = [
  { filterKey: "status", icon: CircleDashedIcon, label: "Status", section: "issues" },
  { filterKey: "assignee", icon: UserRoundIcon, label: "Assignee", section: "issues" },
  {
    disabledReason: "Agent metadata is not available for this project.",
    icon: AgentFilterIcon,
    label: "Agent",
    section: "issues",
  },
  {
    disabledReason: "Agent session metadata is not available for this project.",
    icon: AgentFilterIcon,
    label: "Agent Session",
    section: "issues",
  },
  {
    disabledReason: "Creator metadata is not available for these issues.",
    icon: UserRoundIcon,
    label: "Creator",
    section: "issues",
  },
  {
    filterKey: "priority",
    icon: ChartNoAxesColumnIcon,
    label: "Priority",
    section: "issues",
  },
  { filterKey: "label", icon: TagIcon, label: "Labels", section: "issues" },
  {
    disabledReason: "Relationship filters are not available for this view.",
    icon: FlagIcon,
    label: "Relations",
    section: "issues",
  },
  {
    disabledReason: "Suggested-label metadata is not available for these issues.",
    icon: TagIcon,
    label: "Suggested label",
    section: "issues",
  },
  {
    disabledReason: "Issue date fields are not available for this project.",
    icon: CalendarRangeIcon,
    label: "Dates",
    section: "issues",
  },
  {
    disabledReason: "This view is already scoped to the current project.",
    icon: BoxIcon,
    label: "Project",
    section: "projects",
  },
  {
    disabledReason: "Project property filters are not available for this view.",
    icon: BoxesIcon,
    label: "Project properties",
    section: "projects",
  },
  {
    disabledReason: "Subscriber metadata is not available for these issues.",
    icon: BellIcon,
    label: "Subscribers",
    section: "other",
  },
  {
    disabledReason: "Auto-close metadata is not available for these issues.",
    icon: CircleXIcon,
    label: "Auto-closed",
    section: "other",
  },
  {
    disabledReason: "Use the issue search field to filter content.",
    icon: TextCursorInputIcon,
    label: "Content",
    section: "other",
  },
  {
    disabledReason: "Link metadata is not available for these issues.",
    icon: Link2Icon,
    label: "Links",
    section: "other",
  },
  {
    disabledReason: "Template metadata is not available for these issues.",
    icon: FileTextIcon,
    label: "Template",
    section: "other",
  },
];

const FILTER_MENU_SECTIONS: readonly FilterSection[] = ["issues", "projects", "other"];

interface FilterChoice {
  readonly label: string;
  readonly selected: boolean;
  readonly value: string;
}

function isFilterEntry(panel: FilterPanel): panel is FilterMenuEntry {
  return "section" in panel;
}

function uniqueIssueValues(values: readonly string[]) {
  return [...new Set(values.filter(Boolean))].toSorted();
}

function choicesForEntry({
  entry,
  filters,
  issues,
}: {
  readonly entry: FilterMenuEntry;
  readonly filters: IssueFilters;
  readonly issues: readonly { readonly assignee: string; readonly labels: readonly string[] }[];
}): readonly FilterChoice[] {
  switch (entry.filterKey) {
    case "status":
      return [
        { label: "Any status", selected: filters.status === "all", value: "all" },
        ...BASE_ISSUE_STATUSES.map((status) => ({
          label: status,
          selected: filters.status === status,
          value: status,
        })),
      ];
    case "assignee":
      return [
        { label: "Any assignee", selected: filters.assignee === "all", value: "all" },
        ...uniqueIssueValues(issues.map((issue) => issue.assignee)).map((assignee) => ({
          label: assignee,
          selected: filters.assignee === assignee,
          value: assignee,
        })),
      ];
    case "priority":
      return [
        { label: "Any priority", selected: filters.priority === "all", value: "all" },
        ...BASE_PRIORITIES.map((priority) => ({
          label: priority,
          selected: filters.priority === priority,
          value: priority,
        })),
      ];
    case "label":
      return [
        { label: "Any label", selected: filters.label === "all", value: "all" },
        ...uniqueIssueValues(issues.flatMap((issue) => issue.labels)).map((label) => ({
          label,
          selected: filters.label === label,
          value: label,
        })),
      ];
    default:
      return [];
  }
}

function FilterMenuRow({
  entry,
  onClick,
}: {
  readonly entry: FilterMenuEntry;
  readonly onClick: () => void;
}) {
  const Icon = entry.icon;
  return (
    <button
      aria-label={entry.disabledReason ? `${entry.label}, unavailable` : entry.label}
      className="flex h-8 w-full items-center gap-2 rounded-md px-3 text-left text-sm text-foreground outline-none transition-colors enabled:hover:bg-muted/55 focus-visible:bg-muted/55 disabled:cursor-not-allowed"
      disabled={Boolean(entry.disabledReason)}
      onClick={onClick}
      title={entry.disabledReason}
      type="button"
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate">{entry.label}</span>
      <ChevronRightIcon className="size-3.5 text-muted-foreground/65" />
    </button>
  );
}

export function IssueViewFilterPopover() {
  const { selectedProject, snapshot } = useBaseWorkspace();
  const filters = useIssueWorkspaceStore(
    (state) => state.filtersByProject[selectedProject.id] ?? DEFAULT_ISSUE_FILTERS,
  );
  const setFilters = useIssueWorkspaceStore((state) => state.setFilters);
  const resetFilters = useIssueWorkspaceStore((state) => state.resetFilters);
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<FilterPanel | null>(null);
  const [query, setQuery] = useState("");
  const projectIssues = useMemo(
    () => snapshot.issues.filter((issue) => issue.projectId === selectedProject.id),
    [selectedProject.id, snapshot.issues],
  );
  const activeFilters = hasActiveIssueFilters(filters);
  const visibleEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return normalizedQuery
      ? FILTER_MENU_ENTRIES.filter((entry) =>
          entry.label.toLocaleLowerCase().includes(normalizedQuery),
        )
      : FILTER_MENU_ENTRIES;
  }, [query]);
  const choices = useMemo(
    () =>
      panel && isFilterEntry(panel)
        ? choicesForEntry({
            entry: panel,
            filters,
            issues: projectIssues,
          })
        : [],
    [filters, panel, projectIssues, selectedProject],
  );

  const selectChoice = (value: string) => {
    if (panel && isFilterEntry(panel)) {
      const filterKey = panel.filterKey;
      if (filterKey) {
        setFilters(selectedProject.id, { [filterKey]: value } as Partial<IssueFilters>);
      }
    }
    setOpen(false);
  };

  return (
    <Popover
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setPanel(null);
          setQuery("");
        }
      }}
      open={open}
    >
      <PopoverTrigger
        render={
          <Button
            aria-label="Filter view"
            className="rounded-full"
            size="icon-sm"
            variant={activeFilters ? "secondary" : "ghost"}
          />
        }
      >
        <span className="relative">
          <ListFilterIcon className="size-3.5" />
          {activeFilters ? (
            <span className="absolute -right-1 -top-1 size-1.5 rounded-full bg-primary" />
          ) : null}
        </span>
      </PopoverTrigger>
      <PopoverPopup
        align="end"
        alignOffset={42}
        className="w-[min(13rem,calc(100vw-1rem))]"
        sideOffset={8}
        viewportClassName="p-0 [--viewport-inline-padding:--spacing(0)]"
      >
        {panel ? (
          <div className="min-h-64">
            <div className="flex h-11 items-center gap-2 border-b border-border/55 px-3">
              <Button
                aria-label="Back to filter categories"
                onClick={() => setPanel(null)}
                size="icon-xs"
                variant="ghost"
              >
                <ChevronLeftIcon />
              </Button>
              <span className="text-sm font-semibold">{panel.label}</span>
            </div>
            {isFilterEntry(panel) ? (
              <div className="p-1.5">
                {choices.map((choice) => (
                  <button
                    className="flex h-8 w-full items-center gap-3 rounded-md px-3 text-left text-sm outline-none hover:bg-muted/55 focus-visible:bg-muted/55"
                    key={choice.value}
                    onClick={() => selectChoice(choice.value)}
                    type="button"
                  >
                    <span
                      className={cn(
                        "size-3.5 rounded-full border",
                        choice.selected
                          ? "border-primary bg-primary shadow-[inset_0_0_0_3px_var(--color-background)]"
                          : "border-border",
                      )}
                    />
                    {choice.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex min-h-44 items-center justify-center px-6 text-center text-xs leading-relaxed text-muted-foreground">
                {panel.message}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="relative border-b border-border/55 px-1.5 py-0.5">
              <Input
                aria-label="Add filter"
                autoFocus
                className="h-8 border-0 bg-transparent pl-2 pr-10 text-sm shadow-none focus-visible:ring-0"
                onChange={(event) => setQuery(event.currentTarget.value)}
                placeholder="Add Filter..."
                value={query}
              />
              <span className="absolute right-3 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded border border-border/65 text-[10px] text-muted-foreground">
                F
              </span>
            </div>

            {!query ? (
              <div className="border-b border-border/55 p-0.5">
                <button
                  className="flex h-10 w-full items-center gap-2 rounded-md px-3 text-left text-sm hover:bg-muted/55"
                  onClick={() =>
                    setPanel({
                      label: "AI filter",
                      message: "AI filters are not available in this workspace yet.",
                    })
                  }
                  type="button"
                >
                  <span className="relative">
                    <SearchIcon className="size-4 text-muted-foreground" />
                    <WandSparklesIcon className="absolute -bottom-1 -left-1 size-2.5 text-muted-foreground" />
                  </span>
                  AI filter
                </button>
              </div>
            ) : null}

            {!query ? (
              <div className="border-b border-border/55 p-0.5">
                <button
                  className="flex h-10 w-full items-center gap-2 rounded-md px-3 text-left text-sm hover:bg-muted/55"
                  onClick={() =>
                    setPanel({
                      label: "Advanced filter",
                      message: "Advanced filters are not available in this workspace yet.",
                    })
                  }
                  type="button"
                >
                  <ListFilterIcon className="size-4 text-muted-foreground" />
                  Advanced filter
                </button>
              </div>
            ) : null}

            {FILTER_MENU_SECTIONS.map((section) => {
              const entries = visibleEntries.filter((entry) => entry.section === section);
              if (entries.length === 0) return null;
              return (
                <div
                  className={cn("p-1", section !== "issues" && "border-t border-border/55")}
                  key={section}
                >
                  {entries.map((entry) => (
                    <FilterMenuRow
                      entry={entry}
                      key={entry.label}
                      onClick={() => entry.filterKey && setPanel(entry)}
                    />
                  ))}
                </div>
              );
            })}

            {visibleEntries.length === 0 ? (
              <div className="flex min-h-28 items-center justify-center px-6 text-center text-xs text-muted-foreground">
                No filter properties match “{query}”.
              </div>
            ) : null}

            {activeFilters ? (
              <div className="border-t border-border/55 p-1.5">
                <button
                  className="flex h-8 w-full items-center justify-center rounded-md text-xs text-muted-foreground hover:bg-muted/55 hover:text-foreground"
                  onClick={() => resetFilters(selectedProject.id)}
                  type="button"
                >
                  Clear all filters
                </button>
              </div>
            ) : null}
          </>
        )}
      </PopoverPopup>
    </Popover>
  );
}

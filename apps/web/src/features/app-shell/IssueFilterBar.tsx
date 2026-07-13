import { SearchIcon, SlidersHorizontalIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Popover, PopoverPopup, PopoverTrigger } from "~/components/ui/popover";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

import { useBaseWorkspace } from "./BaseWorkspaceContext";
import { useIssueWorkspaceStore } from "./issueWorkspaceStore";
import { DEFAULT_ISSUE_FILTERS, type IssueFilters } from "./issueRepository";
import {
  BASE_ISSUE_STATUSES,
  BASE_PRIORITIES,
  type BaseIssueStatus,
  type BasePriority,
} from "./workspaceRepository";

interface FilterOption {
  readonly label: string;
  readonly value: string;
}

export function IssueFilterBar() {
  const { selectedProject, snapshot } = useBaseWorkspace();
  const filters = useIssueWorkspaceStore(
    (state) => state.filtersByProject[selectedProject.id] ?? DEFAULT_ISSUE_FILTERS,
  );
  const setFilters = useIssueWorkspaceStore((state) => state.setFilters);
  const resetFilters = useIssueWorkspaceStore((state) => state.resetFilters);
  const uiIntent = useIssueWorkspaceStore((state) => state.uiIntent);
  const consumeUiIntent = useIssueWorkspaceStore((state) => state.consumeUiIntent);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const issues = snapshot.issues.filter(({ projectId }) => projectId === selectedProject.id);
  const optionValues = (select: (issue: (typeof issues)[number]) => readonly string[] | string) =>
    [...new Set(issues.flatMap((issue) => select(issue)))].filter(Boolean).toSorted();
  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => key !== "search" && value !== "all",
  ).length;
  const activeFilterChips = (
    [
      ["status", "Status"],
      ["priority", "Priority"],
      ["workflow", "Workflow"],
      ["assignee", "Assignee"],
      ["module", "Module"],
      ["cycle", "Cycle"],
      ["label", "Label"],
      ["runState", "Run"],
    ] as const
  ).flatMap(([key, label]) => {
    const value = filters[key];
    if (value === "all") return [];
    const displayValue =
      key === "workflow"
        ? value === "assigned" || value === "unassigned"
          ? value
          : (snapshot.workflows.find(({ id }) => id === value)?.name ?? value)
        : value;
    return [{ key, label, value: displayValue }];
  });

  useEffect(() => {
    if (!uiIntent || uiIntent.projectId !== selectedProject.id) return;
    if (uiIntent.type === "filters") setFiltersOpen(true);
    else if (uiIntent.type === "search")
      requestAnimationFrame(() => searchInputRef.current?.focus());
    else return;
    consumeUiIntent(uiIntent.id);
  }, [consumeUiIntent, selectedProject.id, uiIntent]);

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      <div className="relative min-w-56 flex-1 sm:max-w-96">
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute left-2.5 top-1/2 z-10 size-3.5 -translate-y-1/2 text-muted-foreground/65"
        />
        <Input
          aria-label="Search issues"
          className="h-7 bg-background pl-8 text-xs shadow-none"
          onChange={(event) =>
            setFilters(selectedProject.id, { search: event.currentTarget.value })
          }
          placeholder="Search issues, labels, modules, or assignees…"
          ref={searchInputRef}
          value={filters.search}
        />
      </div>

      <Popover onOpenChange={setFiltersOpen} open={filtersOpen}>
        <PopoverTrigger
          render={<Button size="xs" variant={activeFilterCount > 0 ? "secondary" : "ghost"} />}
        >
          <SlidersHorizontalIcon />
          Filters
          {activeFilterCount > 0 ? (
            <span className="rounded-sm bg-primary/12 px-1 font-mono text-[9px] text-primary">
              {activeFilterCount}
            </span>
          ) : null}
        </PopoverTrigger>
        <PopoverPopup align="end" className="w-[min(34rem,calc(100vw-2rem))]" sideOffset={6}>
          <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
            <div>
              <p className="text-xs font-semibold">Filter issues</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                These filters apply to both Issues and Board.
              </p>
            </div>
            <Button onClick={() => resetFilters(selectedProject.id)} size="xs" variant="ghost">
              <XIcon />
              Clear
            </Button>
          </div>
          <div className="grid gap-3 pt-3 sm:grid-cols-2">
            <FilterSelect
              label="Status"
              onValueChange={(status) =>
                setFilters(selectedProject.id, { status: status as "all" | BaseIssueStatus })
              }
              options={[
                { label: "Any status", value: "all" },
                ...BASE_ISSUE_STATUSES.map((status) => ({ label: status, value: status })),
              ]}
              value={filters.status}
            />
            <FilterSelect
              label="Priority"
              onValueChange={(priority) =>
                setFilters(selectedProject.id, {
                  priority: priority as "all" | BasePriority,
                })
              }
              options={[
                { label: "Any priority", value: "all" },
                ...BASE_PRIORITIES.map((priority) => ({ label: priority, value: priority })),
              ]}
              value={filters.priority}
            />
            <FilterSelect
              label="Workflow"
              onValueChange={(workflow) => setFilters(selectedProject.id, { workflow })}
              options={[
                { label: "Any workflow", value: "all" },
                { label: "Assigned", value: "assigned" },
                { label: "Unassigned", value: "unassigned" },
                ...snapshot.workflows.map((workflow) => ({
                  label: workflow.name,
                  value: workflow.id,
                })),
              ]}
              value={filters.workflow}
            />
            <FilterSelect
              label="Assignee"
              onValueChange={(assignee) => setFilters(selectedProject.id, { assignee })}
              options={filterOptions(
                "Any assignee",
                optionValues((issue) => issue.assignee),
              )}
              value={filters.assignee}
            />
            <FilterSelect
              label="Module"
              onValueChange={(module) => setFilters(selectedProject.id, { module })}
              options={filterOptions(
                "Any module",
                optionValues((issue) => issue.module),
              )}
              value={filters.module}
            />
            <FilterSelect
              label="Cycle"
              onValueChange={(cycle) => setFilters(selectedProject.id, { cycle })}
              options={filterOptions(
                "Any cycle",
                optionValues((issue) => issue.cycle),
              )}
              value={filters.cycle}
            />
            <FilterSelect
              label="Label"
              onValueChange={(label) => setFilters(selectedProject.id, { label })}
              options={filterOptions(
                "Any label",
                optionValues((issue) => issue.labels),
              )}
              value={filters.label}
            />
            <FilterSelect
              label="Queue / run"
              onValueChange={(runState) =>
                setFilters(selectedProject.id, {
                  runState: runState as typeof filters.runState,
                })
              }
              options={[
                { label: "Any run state", value: "all" },
                { label: "Active", value: "active" },
                { label: "Idle", value: "idle" },
                { label: "Queued", value: "queued" },
                { label: "Running", value: "running" },
                { label: "In review", value: "review" },
              ]}
              value={filters.runState}
            />
          </div>
        </PopoverPopup>
      </Popover>

      {activeFilterChips.map((chip) => (
        <Button
          className="gap-1 border-primary/15 bg-primary/5 text-[10px]"
          key={chip.key}
          onClick={() =>
            setFilters(selectedProject.id, {
              [chip.key]: "all",
            } as Partial<IssueFilters>)
          }
          size="xs"
          variant="outline"
        >
          <span className="text-muted-foreground">{chip.label}</span>
          {chip.value}
          <XIcon className="size-2.5" />
        </Button>
      ))}

      {filters.search || activeFilterCount > 0 ? (
        <Button onClick={() => resetFilters(selectedProject.id)} size="xs" variant="ghost">
          Clear all
        </Button>
      ) : null}
    </div>
  );
}

function filterOptions(allLabel: string, values: readonly string[]): readonly FilterOption[] {
  return [{ label: allLabel, value: "all" }, ...values.map((value) => ({ label: value, value }))];
}

function FilterSelect({
  label,
  onValueChange,
  options,
  value,
}: {
  readonly label: string;
  readonly onValueChange: (value: string) => void;
  readonly options: readonly FilterOption[];
  readonly value: string;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
      <Select
        items={options}
        onValueChange={(nextValue) => {
          if (nextValue !== null) onValueChange(nextValue);
        }}
        value={value}
      >
        <SelectTrigger className="w-full" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectPopup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
    </label>
  );
}

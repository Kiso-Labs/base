import {
  ArrowDownWideNarrowIcon,
  ArrowUpDownIcon,
  ChevronDownIcon,
  Grid3X3Icon,
  MenuIcon,
  Settings2Icon,
} from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "~/components/ui/button";
import { Popover, PopoverPopup, PopoverTrigger } from "~/components/ui/popover";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { cn } from "~/lib/utils";

import {
  ISSUE_VIEW_GROUP_OPTIONS,
  type IssueViewGroupBy,
  type IssueViewLayout,
} from "./issueRepository";

const DISPLAY_PROPERTIES = [
  "ID",
  "Status",
  "Assignee",
  "Priority",
  "Project",
  "Due date",
  "Milestone",
  "Labels",
  "Links",
  "Time in status",
  "Created",
  "Updated",
] as const;

const ACTIVE_DISPLAY_PROPERTIES = new Set([
  "ID",
  "Status",
  "Assignee",
  "Priority",
  "Project",
  "Due date",
  "Labels",
  "Created",
]);

function SettingsRow({
  children,
  label,
}: {
  readonly children: ReactNode;
  readonly label: string;
}) {
  return (
    <div className="flex min-h-8 items-center justify-between gap-4">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}

function FixedSelect({ label, width }: { readonly label: string; readonly width: string }) {
  return (
    <button
      aria-label={`${label}, unavailable`}
      className={cn(
        "flex h-6 cursor-not-allowed items-center justify-between gap-2 rounded-lg border border-border/70 bg-muted/55 px-2 text-sm text-foreground",
        width,
      )}
      disabled
      title="This setting is not available for project issue views yet."
      type="button"
    >
      <span>{label}</span>
      <ChevronDownIcon className="size-3.5 text-muted-foreground" />
    </button>
  );
}

export function ViewDisplaySettingsPopover({
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
        render={
          <Button
            aria-label="View display settings"
            className="rounded-full"
            size="icon-sm"
            variant="ghost"
          />
        }
      >
        <Settings2Icon className="size-3.5" />
      </PopoverTrigger>
      <PopoverPopup
        align="end"
        className="w-[300px]"
        sideOffset={8}
        viewportClassName="p-0 [--viewport-inline-padding:--spacing(0)]"
      >
        <div className="border-b border-border/55 px-4 pb-4 pt-4">
          <div className="grid grid-cols-2 gap-1.5">
            {(["list", "board"] as const).map((nextLayout) => {
              const selected = layout === nextLayout;
              return (
                <button
                  aria-pressed={selected}
                  className={cn(
                    "flex h-7 items-center justify-center gap-2 rounded-full border text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    selected
                      ? "border-border bg-muted text-foreground"
                      : "border-border/70 text-muted-foreground hover:bg-muted/45 hover:text-foreground",
                  )}
                  key={nextLayout}
                  onClick={() => onLayoutChange(nextLayout)}
                  type="button"
                >
                  {nextLayout === "list" ? (
                    <MenuIcon className="size-4" />
                  ) : (
                    <Grid3X3Icon className="size-4" />
                  )}
                  <span className="capitalize">{nextLayout}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-4">
            <SettingsRow label="Grouping">
              <ArrowUpDownIcon className="size-4 text-foreground/85" />
              <Select
                items={ISSUE_VIEW_GROUP_OPTIONS}
                onValueChange={(nextValue) => nextValue && onGroupByChange(nextValue)}
                value={groupBy}
              >
                <SelectTrigger
                  className="h-6 min-h-6 w-[72px] rounded-lg border-border/70 bg-muted/55 px-2 text-sm shadow-none"
                  size="sm"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup alignItemWithTrigger={false}>
                  {ISSUE_VIEW_GROUP_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </SettingsRow>

            <SettingsRow label="Sub-grouping">
              <FixedSelect label="No grouping" width="w-[106px]" />
            </SettingsRow>

            <SettingsRow label="Ordering">
              <ArrowDownWideNarrowIcon className="size-4 text-foreground/85" />
              <FixedSelect label="Priority" width="w-[77px]" />
            </SettingsRow>

            <SettingsRow label="Order completed by recency">
              <Switch
                aria-label="Order completed by recency, unavailable"
                checked={false}
                className="[--thumb-size:--spacing(3.5)] data-disabled:opacity-100"
                disabled
              />
            </SettingsRow>
          </div>
        </div>

        <div className="border-b border-border/55 px-4 py-3">
          <SettingsRow label="Completed issues">
            <FixedSelect label="All" width="w-[50px]" />
          </SettingsRow>
          <SettingsRow label="Show sub-issues">
            <Switch
              aria-label="Show sub-issues, unavailable"
              checked
              className="[--thumb-size:--spacing(3.5)] data-disabled:opacity-100"
              disabled
            />
          </SettingsRow>
        </div>

        <div className="px-4 pb-4 pt-3">
          <p className="mb-2 text-sm font-semibold text-foreground">List options</p>
          <div>
            <SettingsRow label="Nested sub-issues">
              <Switch
                aria-label="Nested sub-issues, unavailable"
                checked={false}
                className="[--thumb-size:--spacing(3.5)] data-disabled:opacity-100"
                disabled
              />
            </SettingsRow>
            <SettingsRow label="Show empty groups">
              <Switch
                aria-label="Show empty groups, unavailable"
                checked={false}
                className="[--thumb-size:--spacing(3.5)] data-disabled:opacity-100"
                disabled
              />
            </SettingsRow>
          </div>
          <p className="mb-2 mt-3 text-sm font-medium text-muted-foreground">Display properties</p>
          <div className="flex flex-wrap gap-1.5">
            {DISPLAY_PROPERTIES.map((property) => {
              const selected = ACTIVE_DISPLAY_PROPERTIES.has(property);
              return (
                <button
                  aria-label={`${property}, unavailable`}
                  aria-pressed={selected}
                  className={cn(
                    "h-7 cursor-not-allowed rounded-full border px-2.5 text-sm",
                    selected
                      ? "border-border bg-muted text-foreground"
                      : "border-border/70 text-muted-foreground",
                  )}
                  disabled
                  key={property}
                  title="Display-property customization is not available for project issue views yet."
                  type="button"
                >
                  {property}
                </button>
              );
            })}
          </div>
        </div>
      </PopoverPopup>
    </Popover>
  );
}

import { Link } from "@tanstack/react-router";
import {
  BellIcon,
  ChevronRightIcon,
  GitBranchIcon,
  ListChecksIcon,
  SearchIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { useOpenCommandPalette } from "~/commandPaletteContext";
import { Button } from "~/components/ui/button";
import { Kbd } from "~/components/ui/kbd";
import { SidebarInset } from "~/components/ui/sidebar";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";
import { COLLAPSED_SIDEBAR_TITLEBAR_INSET_CLASS } from "~/workspaceTitlebar";

import { useBaseWorkspace } from "./BaseWorkspaceContext";
import { useCommandPaletteShortcutLabel } from "./useCommandPaletteShortcutLabel";
import { selectActiveRunCount } from "./workspaceRepository";

export function BasePageShell({
  actions,
  children,
  description,
  density = "default",
  showIntro,
  title,
}: {
  readonly actions?: ReactNode;
  readonly children: ReactNode;
  readonly description: string;
  readonly density?: "canvas" | "default" | "workspace";
  readonly showIntro?: boolean;
  readonly title: string;
}) {
  const openCommandPalette = useOpenCommandPalette();
  const commandPaletteShortcutLabel = useCommandPaletteShortcutLabel();
  const { selectedProject, selectedRepository, snapshot } = useBaseWorkspace();
  const activeRunCount = selectActiveRunCount(snapshot, selectedProject.id);
  const shouldShowIntro = showIntro ?? density !== "canvas";

  return (
    <SidebarInset className="h-dvh min-h-0 overflow-hidden overscroll-y-none bg-background text-foreground">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
        <header
          className={cn(
            "workspace-topbar drag-region relative z-10 border-b border-border/70 bg-background/95 px-3 transition-[padding-left] duration-200 ease-linear motion-reduce:transition-none sm:px-4",
            COLLAPSED_SIDEBAR_TITLEBAR_INSET_CLASS,
          )}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="truncate text-xs font-medium text-foreground">
              {selectedProject.name}
            </span>
            <ChevronRightIcon className="size-3 shrink-0 text-muted-foreground/45" />
            <span className="truncate text-xs text-muted-foreground">{title}</span>
          </div>

          <Button
            className="mx-4 hidden w-64 justify-start border-border/70 bg-card/35 text-muted-foreground shadow-none lg:flex"
            onClick={openCommandPalette}
            size="sm"
            variant="outline"
          >
            <SearchIcon className="size-3.5" />
            <span className="min-w-0 flex-1 truncate text-left">Search Base</span>
            {commandPaletteShortcutLabel ? (
              <Kbd className="h-5 px-1 text-[9px]">{commandPaletteShortcutLabel}</Kbd>
            ) : null}
          </Button>

          <div className="flex shrink-0 items-center gap-1 [-webkit-app-region:no-drag]">
            <div className="mr-1 hidden items-center gap-1.5 border-r border-border/70 pr-3 xl:flex">
              <span className="font-mono text-[10px] text-muted-foreground/75">
                {selectedRepository.fullName}
              </span>
              <span className="flex items-center gap-1 rounded-sm bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                <GitBranchIcon className="size-3" />
                {selectedRepository.defaultBranch}
              </span>
            </div>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    render={<Link to="/runs" />}
                    aria-label={`${activeRunCount} active runs`}
                    className="gap-1.5"
                    size="sm"
                    variant="ghost"
                  />
                }
              >
                <ListChecksIcon className="size-3.5" />
                <span className="hidden text-xs sm:inline">Queue</span>
                <span className="min-w-4 rounded-sm bg-info/10 px-1 font-mono text-[9px] leading-4 text-info-foreground">
                  {activeRunCount}
                </span>
              </TooltipTrigger>
              <TooltipPopup side="bottom">Open queue activity</TooltipPopup>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button aria-label="Notifications" size="icon-xs" variant="ghost">
                    <BellIcon className="size-3.5" />
                    <span className="absolute right-1 top-1 size-1.5 rounded-full bg-warning ring-2 ring-background" />
                  </Button>
                }
              />
              <TooltipPopup side="bottom">4 notifications need attention</TooltipPopup>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    render={<Link to="/settings" />}
                    aria-label="Open Kiso Labs settings"
                    className="ml-1 rounded-md border-border/70 bg-card text-[10px] font-semibold"
                    size="icon-xs"
                    variant="outline"
                  >
                    KL
                  </Button>
                }
              />
              <TooltipPopup align="end" side="bottom">
                Kiso Labs settings
              </TooltipPopup>
            </Tooltip>
          </div>
        </header>

        <main
          className={cn(
            "min-h-0 flex-1",
            density === "canvas" ? "overflow-hidden" : "overflow-y-auto",
          )}
        >
          <div
            className={cn(
              "mx-auto flex w-full flex-col px-4",
              density === "canvas"
                ? "h-full min-h-0 max-w-none p-0"
                : density === "workspace"
                  ? "max-w-none py-3 sm:px-4 sm:py-4"
                  : "max-w-[1600px] py-5 sm:px-6 sm:py-6",
            )}
          >
            {shouldShowIntro ? (
              <div
                className={cn(
                  "flex flex-wrap items-start justify-between gap-4 border-b border-border/60",
                  density === "workspace" ? "pb-3" : "pb-5",
                )}
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/60">
                    {snapshot.workspace.name} / {selectedProject.identifier}
                  </p>
                  <h1
                    className={cn(
                      "font-semibold tracking-[-0.02em] text-foreground",
                      density === "workspace" ? "mt-1 text-base" : "mt-1.5 text-xl",
                    )}
                  >
                    {title}
                  </h1>
                  <p
                    className={cn(
                      "mt-1 max-w-3xl text-muted-foreground",
                      density === "workspace" ? "text-xs leading-4" : "text-sm leading-5",
                    )}
                  >
                    {description}
                  </p>
                </div>
                {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
              </div>
            ) : (
              <div className="sr-only">
                <h1>{title}</h1>
                <p>{description}</p>
              </div>
            )}
            <div
              className={cn(
                shouldShowIntro ? (density === "workspace" ? "pt-3" : "pt-5") : undefined,
                density === "canvas" && "flex min-h-0 flex-1 flex-col",
              )}
            >
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarInset>
  );
}

export function BaseMetricCard({
  detail,
  label,
  tone = "neutral",
  value,
}: {
  readonly detail: string;
  readonly label: string;
  readonly tone?: "neutral" | "info" | "success" | "warning";
  readonly value: string;
}) {
  return (
    <div className="min-w-0 border-r border-border/60 px-4 first:pl-0 last:border-r-0 last:pr-0">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "size-1.5 rounded-full",
            tone === "neutral" && "bg-muted-foreground/45",
            tone === "info" && "bg-info",
            tone === "success" && "bg-success",
            tone === "warning" && "bg-warning",
          )}
        />
        <p className="truncate text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground/65">
          {label}
        </p>
      </div>
      <p className="mt-2 font-mono text-xl font-medium tracking-tight text-foreground">{value}</p>
      <p className="mt-0.5 truncate text-[11px] text-muted-foreground/75">{detail}</p>
    </div>
  );
}

export function BasePanel({
  children,
  className,
  description,
  title,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly description?: string;
  readonly title?: string;
}) {
  return (
    <section
      className={cn("overflow-hidden rounded-lg border border-border/70 bg-card/35", className)}
    >
      {title ? (
        <div className="flex min-h-11 items-center justify-between border-b border-border/60 px-3.5 py-2.5">
          <div>
            <h2 className="text-xs font-semibold text-foreground">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
      ) : null}
      {children}
    </section>
  );
}

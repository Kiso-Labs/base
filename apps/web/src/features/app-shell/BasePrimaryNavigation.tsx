import { Link, useLocation } from "@tanstack/react-router";
import {
  BoxIcon,
  ChevronDownIcon,
  CopyIcon,
  EllipsisIcon,
  MegaphoneIcon,
  ScanIcon,
  SearchIcon,
} from "lucide-react";
import { useState } from "react";

import { useOpenCommandPalette } from "~/commandPaletteContext";
import { Kbd } from "~/components/ui/kbd";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "~/components/ui/sidebar";

import { BaseProjectSwitcher } from "./BaseProjectSwitcher";
import { useBaseWorkspace } from "./BaseWorkspaceContext";
import {
  BASE_NAVIGATION_ITEMS,
  resolveBaseNavigationItem,
  type BaseNavigationId,
  type BaseNavigationItem,
} from "./navigation";
import { useCommandPaletteShortcutLabel } from "./useCommandPaletteShortcutLabel";
import { selectActiveRunCount, selectAttentionCount } from "./workspaceRepository";

const navigationItemById = new Map(BASE_NAVIGATION_ITEMS.map((item) => [item.id, item]));

function navigationItem(
  id: BaseNavigationId,
  overrides: Partial<Pick<BaseNavigationItem, "icon" | "label">> = {},
): BaseNavigationItem {
  const item = navigationItemById.get(id);
  if (!item) throw new Error(`Missing Base navigation item: ${id}`);
  return { ...item, ...overrides };
}

const QUICK_NAVIGATION_ITEMS = [
  navigationItem("inbox"),
  navigationItem("issues", { icon: ScanIcon, label: "My issues" }),
] as const;

const PROJECTS_NAVIGATION_ITEM = navigationItem("agents", {
  icon: BoxIcon,
  label: "Projects",
});
const VIEWS_NAVIGATION_ITEM = navigationItem("views");

const WORKSPACE_NAVIGATION_ITEMS = [PROJECTS_NAVIGATION_ITEM, VIEWS_NAVIGATION_ITEM] as const;

const TEAM_NAVIGATION_ITEMS = [
  navigationItem("issues", { icon: CopyIcon }),
  PROJECTS_NAVIGATION_ITEM,
  VIEWS_NAVIGATION_ITEM,
] as const;

const WORKSPACE_MORE_NAVIGATION_ITEMS = [
  navigationItem("board"),
  navigationItem("workflows"),
  navigationItem("runs"),
  navigationItem("repository"),
  navigationItem("settings"),
] as const;

const WORKSPACE_MORE_NAVIGATION_IDS = new Set<BaseNavigationId>(
  WORKSPACE_MORE_NAVIGATION_ITEMS.map(({ id }) => id),
);

export function BasePrimaryNavigation() {
  const pathname = useLocation({ select: (location) => location.pathname });
  const activeItem = resolveBaseNavigationItem(pathname);
  const openCommandPalette = useOpenCommandPalette();
  const commandPaletteShortcutLabel = useCommandPaletteShortcutLabel();
  const { selectedProject, snapshot } = useBaseWorkspace();
  const { isMobile, setOpenMobile } = useSidebar();
  const [teamOpen, setTeamOpen] = useState(true);
  const [moreOpen, setMoreOpen] = useState(false);
  const badgeById: Partial<Record<BaseNavigationId, string>> = {
    inbox: String(selectAttentionCount(snapshot, selectedProject.id)),
    runs: String(selectActiveRunCount(snapshot, selectedProject.id)),
  };
  const closeMobileSidebar = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <div className="shrink-0 px-2 pb-2">
      <BaseProjectSwitcher />
      <button
        type="button"
        className="mt-1 flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-xs text-muted-foreground outline-hidden transition-colors hover:bg-accent/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        onClick={openCommandPalette}
      >
        <SearchIcon className="size-3.5" />
        <span className="min-w-0 flex-1 truncate">Search or run a command</span>
        {commandPaletteShortcutLabel ? (
          <Kbd className="h-5 min-w-0 gap-0.5 px-1 text-[9px]">{commandPaletteShortcutLabel}</Kbd>
        ) : null}
      </button>

      <nav className="mt-3" aria-label="Base navigation">
        <NavigationGroup
          items={QUICK_NAVIGATION_ITEMS}
          activeItemId={activeItem?.id === "inbox" ? "inbox" : null}
          badgeById={badgeById}
          onNavigate={closeMobileSidebar}
        />

        <div className="mt-5">
          <p className="mb-1 flex items-center gap-1 px-2 text-[11px] font-medium text-muted-foreground/65">
            Workspace
            <ChevronDownIcon className="size-2.5" />
          </p>
          <SidebarMenu>
            {WORKSPACE_NAVIGATION_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    className="h-7 gap-2 px-2 text-[12px]"
                    render={<Link onClick={closeMobileSidebar} to={item.to} />}
                    size="sm"
                    title={item.description}
                  >
                    <Icon className="size-3.5 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
            <SidebarMenuItem>
              <SidebarMenuButton
                aria-expanded={moreOpen}
                className="h-7 gap-2 px-2 text-[12px]"
                isActive={Boolean(activeItem && WORKSPACE_MORE_NAVIGATION_IDS.has(activeItem.id))}
                onClick={() => setMoreOpen((open) => !open)}
                size="sm"
                title={moreOpen ? "Hide more workspace links" : "Show more workspace links"}
                type="button"
              >
                <EllipsisIcon className="size-3.5 shrink-0" />
                <span className="min-w-0 flex-1 truncate">More</span>
                <ChevronDownIcon
                  className={`size-3 shrink-0 text-muted-foreground/60 transition-transform ${moreOpen ? "" : "-rotate-90"}`}
                />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          {moreOpen ? (
            <NavigationGroup
              activeItemId={activeItem?.id ?? null}
              badgeById={badgeById}
              className="mt-0.5 pl-5"
              items={WORKSPACE_MORE_NAVIGATION_ITEMS}
              onNavigate={closeMobileSidebar}
            />
          ) : null}
        </div>

        <div className="mt-5">
          <p className="mb-1 flex items-center gap-1 px-2 text-[11px] font-medium text-muted-foreground/65">
            Your teams
            <ChevronDownIcon className="size-2.5" />
          </p>
          <button
            aria-expanded={teamOpen}
            className="flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-[12px] font-medium text-foreground/80 outline-hidden transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setTeamOpen((open) => !open)}
            type="button"
          >
            <MegaphoneIcon className="size-3.5 shrink-0 text-info" />
            <span className="min-w-0 flex-1 truncate">{selectedProject.name}</span>
            <ChevronDownIcon
              className={`size-3 shrink-0 text-muted-foreground/60 transition-transform ${teamOpen ? "" : "-rotate-90"}`}
            />
          </button>

          {teamOpen ? (
            <SidebarMenu className="mt-0.5 pl-5">
              {TEAM_NAVIGATION_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = item.id === activeItem?.id;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      className="h-7 gap-2 rounded-lg px-2 text-[13px]"
                      isActive={isActive}
                      render={<Link onClick={closeMobileSidebar} to={item.to} />}
                      size="sm"
                      title={item.description}
                    >
                      <Icon className="size-3.5 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          ) : null}
        </div>
      </nav>
    </div>
  );
}

function NavigationGroup({
  activeItemId,
  badgeById,
  className,
  items,
  label,
  onNavigate,
}: {
  readonly activeItemId: string | null;
  readonly badgeById: Partial<Record<BaseNavigationId, string>>;
  readonly className?: string;
  readonly items: readonly BaseNavigationItem[];
  readonly label?: string;
  readonly onNavigate: () => void;
}) {
  return (
    <div className={className}>
      {label ? (
        <p className="mb-1 px-2 text-[11px] font-medium text-muted-foreground/65">{label}</p>
      ) : null}
      <SidebarMenu>
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeItemId;
          const badge = badgeById[item.id];
          return (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                className="h-7 gap-2 px-2 text-[12px]"
                isActive={isActive}
                render={<Link onClick={onNavigate} to={item.to} />}
                size="sm"
                title={item.description}
              >
                <Icon className="size-3.5 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {badge ? (
                  <span className="min-w-4 rounded-sm bg-muted px-1 text-center font-mono text-[9px] leading-4 text-muted-foreground group-data-[active=true]/menu-button:bg-primary/12 group-data-[active=true]/menu-button:text-primary">
                    {badge}
                  </span>
                ) : null}
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </div>
  );
}

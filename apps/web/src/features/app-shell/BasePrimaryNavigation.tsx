import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { LibraryBigIcon, SearchIcon } from "lucide-react";

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
import { useIssueWorkspaceStore } from "./issueWorkspaceStore";
import { selectActiveRunCount, selectAttentionCount } from "./workspaceRepository";

const WORK_NAVIGATION_IDS = new Set(["inbox", "issues", "board", "workflows", "runs"]);

export function BasePrimaryNavigation() {
  const pathname = useLocation({ select: (location) => location.pathname });
  const navigate = useNavigate();
  const activeItem = resolveBaseNavigationItem(pathname);
  const openCommandPalette = useOpenCommandPalette();
  const commandPaletteShortcutLabel = useCommandPaletteShortcutLabel();
  const { selectedProject, snapshot } = useBaseWorkspace();
  const { isMobile, setOpenMobile } = useSidebar();
  const views = useIssueWorkspaceStore((state) => state.views);
  const activeViewId = useIssueWorkspaceStore(
    (state) => state.activeViewIdByProject[selectedProject.id] ?? null,
  );
  const activateView = useIssueWorkspaceStore((state) => state.activateView);
  const projectViews = views.filter(({ projectId }) => projectId === selectedProject.id);
  const badgeById: Partial<Record<BaseNavigationId, string>> = {
    inbox: String(selectAttentionCount(snapshot, selectedProject.id)),
    runs: String(selectActiveRunCount(snapshot, selectedProject.id)),
  };

  return (
    <div className="shrink-0 px-2 pb-2">
      <BaseProjectSwitcher />
      <button
        type="button"
        className="mt-2 flex h-8 w-full items-center gap-2 rounded-md border border-border/60 bg-background/25 px-2 text-left text-xs text-muted-foreground outline-hidden transition-colors hover:border-border hover:bg-accent/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
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
          label="Work"
          items={BASE_NAVIGATION_ITEMS.filter(({ id }) => WORK_NAVIGATION_IDS.has(id))}
          activeItemId={activeItem?.id ?? null}
          badgeById={badgeById}
          onNavigate={() => {
            if (isMobile) setOpenMobile(false);
          }}
        />
        <div className="mt-3">
          <p className="mb-1 px-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/55">
            Project views
          </p>
          <SidebarMenu>
            {projectViews.map((view) => (
              <SidebarMenuItem key={view.id}>
                <SidebarMenuButton
                  className="h-7 gap-2 px-2 text-[12px]"
                  isActive={
                    view.id === activeViewId && (pathname === "/issues" || pathname === "/board")
                  }
                  onClick={() => {
                    activateView(selectedProject.id, view.id);
                    void navigate({ to: view.layout === "board" ? "/board" : "/issues" });
                    if (isMobile) setOpenMobile(false);
                  }}
                  size="sm"
                  title={`${view.name} · ${view.layout}`}
                >
                  <LibraryBigIcon className="size-3.5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{view.name}</span>
                  <span className="font-mono text-[8px] uppercase text-muted-foreground/60">
                    {view.layout.slice(0, 1)}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </div>
        <NavigationGroup
          label="Build"
          className="mt-3"
          items={BASE_NAVIGATION_ITEMS.filter(({ id }) => !WORK_NAVIGATION_IDS.has(id))}
          activeItemId={activeItem?.id ?? null}
          badgeById={badgeById}
          onNavigate={() => {
            if (isMobile) setOpenMobile(false);
          }}
        />
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
  readonly label: string;
  readonly onNavigate: () => void;
}) {
  return (
    <div className={className}>
      <p className="mb-1 px-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/55">
        {label}
      </p>
      <SidebarMenu>
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeItemId;
          const badge = badgeById[item.id];
          return (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                render={<Link to={item.to} onClick={onNavigate} />}
                size="sm"
                isActive={isActive}
                className="h-7 gap-2 px-2 text-[12px]"
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

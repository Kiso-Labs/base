import {
  BotIcon,
  GitBranchIcon,
  HistoryIcon,
  InboxIcon,
  Layers3Icon,
  ListTodoIcon,
  SettingsIcon,
  WorkflowIcon,
  type LucideIcon,
} from "lucide-react";

export type BaseNavigationId =
  | "inbox"
  | "issues"
  | "board"
  | "workflows"
  | "runs"
  | "agents"
  | "repository"
  | "settings";

export type BaseNavigationPath =
  | "/inbox"
  | "/issues"
  | "/board"
  | "/views"
  | "/workflows"
  | "/runs"
  | "/agents"
  | "/repository"
  | "/settings";

export interface BaseNavigationItem {
  readonly id: BaseNavigationId;
  readonly label: string;
  readonly to: BaseNavigationPath;
  readonly description: string;
  readonly searchTerms: readonly string[];
  readonly icon: LucideIcon;
}

export const BASE_NAVIGATION_ITEMS: readonly BaseNavigationItem[] = [
  {
    id: "inbox",
    label: "Inbox",
    to: "/inbox",
    description: "Approvals, failures, and work that needs attention",
    searchTerms: ["attention", "approvals", "questions", "failures"],
    icon: InboxIcon,
  },
  {
    id: "issues",
    label: "Issues",
    to: "/issues",
    description: "Plan and queue development work",
    searchTerms: ["work items", "tasks", "list", "queue"],
    icon: ListTodoIcon,
  },
  {
    id: "board",
    label: "Views",
    to: "/views",
    description: "Create and open saved issue views",
    searchTerms: ["saved views", "filters", "issues", "kanban", "list"],
    icon: Layers3Icon,
  },
  {
    id: "workflows",
    label: "Workflows",
    to: "/workflows",
    description: "Define how agents execute work",
    searchTerms: ["canvas", "automation", "graph", "flow"],
    icon: WorkflowIcon,
  },
  {
    id: "runs",
    label: "Runs",
    to: "/runs",
    description: "Inspect workflow execution history",
    searchTerms: ["history", "timeline", "logs", "queue"],
    icon: HistoryIcon,
  },
  {
    id: "agents",
    label: "Agents",
    to: "/agents",
    description: "Open agent sessions and worktrees",
    searchTerms: ["codex", "claude", "cursor", "sessions", "chat"],
    icon: BotIcon,
  },
  {
    id: "repository",
    label: "Repository",
    to: "/repository",
    description: "Branches, worktrees, changes, and hooks",
    searchTerms: ["git", "branch", "worktree", "commits", "pull request"],
    icon: GitBranchIcon,
  },
  {
    id: "settings",
    label: "Settings",
    to: "/settings",
    description: "Providers, policies, appearance, and connections",
    searchTerms: ["preferences", "configuration", "providers", "keybindings"],
    icon: SettingsIcon,
  },
];

const AGENTS_NAVIGATION_ITEM = BASE_NAVIGATION_ITEMS.find((item) => item.id === "agents")!;

export function resolveBaseNavigationItem(pathname: string): BaseNavigationItem | null {
  const productItem = BASE_NAVIGATION_ITEMS.find(
    (item) => pathname === item.to || pathname.startsWith(`${item.to}/`),
  );
  if (productItem) {
    return productItem;
  }

  if (pathname === "/" || pathname.startsWith("/draft/")) {
    return AGENTS_NAVIGATION_ITEM;
  }

  const segments = pathname.split("/").filter(Boolean);
  return segments.length === 2 ? AGENTS_NAVIGATION_ITEM : null;
}

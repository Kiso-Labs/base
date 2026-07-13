import type { IssueUiIntentRequest } from "./issueWorkspaceStore";

export type IssueCommandId =
  | "issue.create"
  | "issue.search"
  | "issue.filters"
  | "issue.goList"
  | "issue.goBoard"
  | "issue.toggleLayout"
  | "issue.queueView";

export interface IssueCommandContext {
  readonly source: "palette" | "shortcut";
  readonly pathname: string;
  readonly projectId: string;
  readonly visibleIssueIds: readonly string[];
  readonly requestUiIntent: (intent: IssueUiIntentRequest) => void;
  readonly navigate: (to: "/issues" | "/board") => void;
}

export function isIssueCommandId(command: string): command is IssueCommandId {
  return (
    command === "issue.create" ||
    command === "issue.search" ||
    command === "issue.filters" ||
    command === "issue.goList" ||
    command === "issue.goBoard" ||
    command === "issue.toggleLayout" ||
    command === "issue.queueView"
  );
}

export function executeIssueCommand(command: string, context: IssueCommandContext): boolean {
  if (!isIssueCommandId(command)) return false;

  const issueSurface = context.pathname === "/issues" || context.pathname === "/board";
  if (command === "issue.filters" && context.source === "shortcut" && !issueSurface) {
    return false;
  }
  if (command === "issue.goList") {
    context.navigate("/issues");
    return true;
  }
  if (command === "issue.goBoard") {
    context.navigate("/board");
    return true;
  }
  if (command === "issue.toggleLayout") {
    context.navigate(context.pathname === "/board" ? "/issues" : "/board");
    return true;
  }
  if (command === "issue.queueView") {
    context.requestUiIntent({
      type: "queue-view",
      projectId: context.projectId,
      issueIds: context.visibleIssueIds,
    });
  } else {
    context.requestUiIntent({
      type:
        command === "issue.create" ? "create" : command === "issue.search" ? "search" : "filters",
      projectId: context.projectId,
    });
  }
  if (!issueSurface) context.navigate("/issues");
  return true;
}

import { describe, expect, it, vi } from "vite-plus/test";

import { executeIssueCommand } from "./issueCommands";

function createContext(overrides: Partial<Parameters<typeof executeIssueCommand>[1]> = {}) {
  return {
    source: "shortcut" as const,
    pathname: "/issues",
    projectId: "project-base-desktop",
    visibleIssueIds: ["issue-bas-101"],
    requestUiIntent: vi.fn(),
    navigate: vi.fn(),
    ...overrides,
  };
}

describe("issue commands", () => {
  it("keeps the filter shortcut scoped to issue surfaces", () => {
    const context = createContext({ pathname: "/runs" });

    expect(executeIssueCommand("issue.filters", context)).toBe(false);
    expect(context.requestUiIntent).not.toHaveBeenCalled();
    expect(context.navigate).not.toHaveBeenCalled();
  });

  it("allows the palette to open issue filters from another surface", () => {
    const context = createContext({ pathname: "/runs", source: "palette" });

    expect(executeIssueCommand("issue.filters", context)).toBe(true);
    expect(context.requestUiIntent).toHaveBeenCalledWith({
      type: "filters",
      projectId: "project-base-desktop",
    });
    expect(context.navigate).toHaveBeenCalledWith("/issues");
  });

  it("materializes the current project view when queueing", () => {
    const context = createContext();

    expect(executeIssueCommand("issue.queueView", context)).toBe(true);
    expect(context.requestUiIntent).toHaveBeenCalledWith({
      type: "queue-view",
      projectId: "project-base-desktop",
      issueIds: ["issue-bas-101"],
    });
  });
});

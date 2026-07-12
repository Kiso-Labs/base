import { describe, expect, it } from "vite-plus/test";

import {
  baseWorkspaceRepository,
  selectActiveRunCount,
  selectAttentionCount,
} from "./workspaceRepository";

describe("Base fixture workspace repository", () => {
  it("keeps seeded work linked by stable product IDs", () => {
    const snapshot = baseWorkspaceRepository.read();

    expect(snapshot.workspace.name).toBe("Kiso Labs");
    expect(snapshot.projects[0]).toMatchObject({
      id: "project-base-desktop",
      name: "Base Desktop",
      repositoryId: "repository-base",
    });
    expect(snapshot.issues.map((issue) => issue.identifier)).toEqual([
      "BAS-101",
      "BAS-102",
      "BAS-103",
      "BAS-104",
      "BAS-105",
    ]);
    expect(snapshot.runs.every((run) => snapshot.issues.some(({ id }) => id === run.issueId))).toBe(
      true,
    );
  });

  it("resolves known projects without fabricating missing ones", () => {
    expect(baseWorkspaceRepository.getProject("project-base-desktop")?.name).toBe("Base Desktop");
    expect(baseWorkspaceRepository.getProject("missing-project")).toBeNull();
  });

  it("derives shell activity badges from the workspace snapshot", () => {
    const snapshot = baseWorkspaceRepository.read();

    expect(selectActiveRunCount(snapshot)).toBe(3);
    expect(selectAttentionCount(snapshot)).toBe(4);
  });
});

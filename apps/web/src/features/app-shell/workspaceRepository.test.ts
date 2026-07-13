import { describe, expect, it } from "vite-plus/test";

import {
  baseWorkspaceRepository,
  selectActiveRunCount,
  selectAttentionCount,
  selectProjectRuns,
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
    expect(
      snapshot.issues
        .filter(({ projectId }) => projectId === "project-base-desktop")
        .map((issue) => issue.identifier),
    ).toEqual(["BAS-101", "BAS-102", "BAS-103", "BAS-104", "BAS-105"]);
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
    const projectId = snapshot.projects[0]!.id;

    expect(selectActiveRunCount(snapshot, projectId)).toBe(3);
    expect(selectAttentionCount(snapshot, projectId)).toBe(4);
  });

  it("keeps run history scoped to its owning project", () => {
    const snapshot = baseWorkspaceRepository.read();
    const projectId = snapshot.projects[0]!.id;
    const otherProjectRun = {
      ...snapshot.runs[0]!,
      id: "RUN-9999",
      projectId: "project-other",
    };
    const withAnotherProject = { ...snapshot, runs: [...snapshot.runs, otherProjectRun] };

    expect(selectProjectRuns(withAnotherProject, projectId)).toHaveLength(3);
    expect(selectActiveRunCount(withAnotherProject, projectId)).toBe(3);
  });

  it("shares workflow templates across projects while keeping issues and runs owned", () => {
    const snapshot = baseWorkspaceRepository.read();
    const relayProject = snapshot.projects.find(({ id }) => id === "project-base-relay");

    expect(relayProject).toBeDefined();
    const relayIssues = snapshot.issues.filter(({ projectId }) => projectId === relayProject?.id);
    const relayRuns = selectProjectRuns(snapshot, relayProject!.id);
    expect(relayIssues.map(({ identifier }) => identifier)).toEqual(["RLY-1", "RLY-2"]);
    expect(relayRuns).toHaveLength(1);
    expect(relayRuns[0]).toMatchObject({ issueId: "issue-rly-2", workflowId: "workflow-bug-fix" });
    expect(snapshot.workflows.some(({ id }) => id === relayIssues[0]?.workflowId)).toBe(true);
  });
});

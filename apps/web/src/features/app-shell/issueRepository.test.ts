import { describe, expect, it } from "vite-plus/test";

import { baseWorkspaceRepository } from "./workspaceRepository";
import {
  BASE_ISSUE_TEMPLATES,
  DEFAULT_ISSUE_FILTERS,
  applyIssueTemplate,
  assignIssueWorkflow,
  createDefaultIssueViews,
  createIssue,
  createIssueRepositoryState,
  createIssueView,
  dequeueIssue,
  filterIssues,
  groupIssues,
  hasActiveIssueFilters,
  issueViewPath,
  queueIssues,
  queueIssueView,
  resolveIssueView,
  transitionIssue,
  updateIssue,
} from "./issueRepository";

describe("issue repository", () => {
  it("routes saved views to their matching issue presentation", () => {
    expect(issueViewPath("list")).toBe("/issues");
    expect(issueViewPath("board")).toBe("/board");
  });

  it("detects whether a project issue query has active filters", () => {
    expect(hasActiveIssueFilters(DEFAULT_ISSUE_FILTERS)).toBe(false);
    expect(hasActiveIssueFilters({ ...DEFAULT_ISSUE_FILTERS, search: "retry" })).toBe(true);
    expect(hasActiveIssueFilters({ ...DEFAULT_ISSUE_FILTERS, workflow: "assigned" })).toBe(true);
  });
  it("creates a backlog issue with a stable project identifier and safe defaults", () => {
    const snapshot = baseWorkspaceRepository.read();
    const state = createIssueRepositoryState(snapshot);
    const project = snapshot.projects[0]!;
    const repository = snapshot.repositories[0]!;

    const result = createIssue(state, {
      project,
      repository,
      title: "Add approval timeout policy",
    });

    expect(result.issue).toMatchObject({
      id: "issue-bas-106",
      identifier: "BAS-106",
      projectId: project.id,
      repositoryId: repository.id,
      branch: repository.defaultBranch,
      title: "Add approval timeout policy",
      status: "Backlog",
      priority: "None",
      workflowId: null,
      runState: "idle",
      queuePosition: null,
    });
    expect(result.state.issues.at(-1)).toEqual(result.issue);
    expect(result.state.nextIssueNumberByProject[project.id]).toBe(107);
  });

  it("allocates issue identifiers within the owning project", () => {
    const snapshot = baseWorkspaceRepository.read();
    const project = snapshot.projects[0]!;
    const repository = snapshot.repositories[0]!;
    const otherProjectIssue = {
      ...snapshot.issues[0]!,
      id: "issue-rly-900",
      projectId: "project-relay",
      identifier: "RLY-900",
    };
    const state = createIssueRepositoryState({
      ...snapshot,
      issues: [...snapshot.issues, otherProjectIssue],
    });

    const result = createIssue(state, { project, repository, title: "Project-local sequence" });

    expect(result.issue.identifier).toBe("BAS-106");
  });

  it("rejects invalid issue creation at the repository boundary", () => {
    const snapshot = baseWorkspaceRepository.read();
    const state = createIssueRepositoryState(snapshot);
    const project = snapshot.projects[0]!;
    const repository = snapshot.repositories[0]!;

    expect(() => createIssue(state, { project, repository, title: "   " })).toThrow(
      "Issue title is required.",
    );
    expect(() =>
      createIssue(state, {
        project: { ...project, repositoryId: "repository-other" },
        repository,
        title: "Cross-project issue",
      }),
    ).toThrow("The selected repository does not belong to this project.");
  });

  it("combines search and structured filters over the same issue collection", () => {
    const snapshot = baseWorkspaceRepository.read();
    const project = snapshot.projects[0]!;

    const visibleIssues = filterIssues(snapshot.issues, project.id, {
      ...DEFAULT_ISSUE_FILTERS,
      search: "retry canvas",
      status: "Backlog",
      priority: "Medium",
      label: "canvas",
      module: "Workflow builder",
      cycle: "Icebox",
      assignee: "Unassigned",
      workflow: "unassigned",
      runState: "idle",
    });

    expect(visibleIssues.map(({ identifier }) => identifier)).toEqual(["BAS-103"]);
  });

  it("guards lifecycle transitions and remembers where blocked work should resume", () => {
    const initial = createIssueRepositoryState(baseWorkspaceRepository.read());
    const invalid = transitionIssue(initial, "issue-bas-103", "Done");

    expect(invalid).toMatchObject({
      ok: false,
      reason: "Backlog issues must be planned before they can move forward.",
    });
    expect(invalid.state).toBe(initial);

    const blocked = transitionIssue(initial, "issue-bas-103", "Blocked");
    expect(blocked).toMatchObject({
      ok: true,
      issue: { status: "Blocked", blockedFromStatus: "Backlog" },
    });

    const resumed = transitionIssue(blocked.state, "issue-bas-103", "Backlog");
    expect(resumed).toMatchObject({
      ok: true,
      issue: { status: "Backlog", blockedFromStatus: null },
    });
  });

  it("assigns workflows unless execution has already reserved the issue", () => {
    const initial = createIssueRepositoryState(baseWorkspaceRepository.read());
    const assigned = assignIssueWorkflow(initial, "issue-bas-103", "workflow-bug-fix");

    expect(assigned).toMatchObject({
      ok: true,
      issue: { workflowId: "workflow-bug-fix" },
    });

    const queued = assignIssueWorkflow(initial, "issue-bas-105", "workflow-bug-fix");
    expect(queued).toMatchObject({
      ok: false,
      reason: "Dequeue BAS-105 before changing its workflow.",
    });
    expect(queued.state).toBe(initial);
  });

  it("rejects workflow assignments and queue overrides that are not workspace templates", () => {
    const initial = createIssueRepositoryState(baseWorkspaceRepository.read());
    const assigned = assignIssueWorkflow(initial, "issue-bas-103", "workflow-missing");

    expect(assigned).toMatchObject({
      ok: false,
      reason: "The selected workflow template no longer exists.",
    });
    expect(assigned.state).toBe(initial);

    const queued = queueIssues(initial, ["issue-bas-101"], "workflow-missing");
    expect(queued.queuedIds).toEqual([]);
    expect(queued.rejected).toEqual([
      {
        issueId: "issue-bas-101",
        reason: "The selected workflow template no longer exists.",
      },
    ]);
    expect(queued.state.runs).toBe(initial.runs);
  });

  it("allows draft assignment but requires a published version before queueing", () => {
    const initial = createIssueRepositoryState(baseWorkspaceRepository.read());
    const draftState = {
      ...initial,
      workflowIds: [...initial.workflowIds, "workflow-new-draft"],
      workflowVersionById: {
        ...initial.workflowVersionById,
        "workflow-new-draft": null,
      },
    };
    const assigned = assignIssueWorkflow(draftState, "issue-bas-101", "workflow-new-draft");
    expect(assigned).toMatchObject({ ok: true, issue: { workflowId: "workflow-new-draft" } });

    const queued = queueIssues(assigned.state, ["issue-bas-101"]);
    expect(queued.queuedIds).toEqual([]);
    expect(queued.rejected).toEqual([
      {
        issueId: "issue-bas-101",
        reason: "Publish the workflow assigned to BAS-101 before queueing it.",
      },
    ]);
  });

  it("queues only ready issues with workflows and creates deterministic run context", () => {
    const initial = createIssueRepositoryState(baseWorkspaceRepository.read());
    const result = queueIssues(initial, ["issue-bas-101", "issue-bas-103", "issue-bas-105"]);

    expect(result.queuedIds).toEqual(["issue-bas-101"]);
    expect(result.rejected).toEqual([
      {
        issueId: "issue-bas-103",
        reason: "Attach a workflow to BAS-103 before queueing it.",
      },
      {
        issueId: "issue-bas-105",
        reason: "BAS-105 is already queued for execution.",
      },
    ]);
    expect(result.state.issues.find(({ id }) => id === "issue-bas-101")).toMatchObject({
      status: "Queued",
      runState: "queued",
      queuePosition: 3,
      latestRunId: "RUN-2049",
    });
    expect(result.state.runs.at(-1)).toMatchObject({
      id: "RUN-2049",
      projectId: "project-base-desktop",
      issueId: "issue-bas-101",
      workflowId: "workflow-reliable-feature-delivery",
      workflowVersionId: "workflow-reliable-feature-delivery:v7",
      workflowVersion: 7,
      status: "Queued",
    });
    expect(result.state.nextRunNumber).toBe(2050);
  });

  it("updates inspector fields while rejecting an empty title", () => {
    const initial = createIssueRepositoryState(baseWorkspaceRepository.read());
    const invalid = updateIssue(initial, "issue-bas-103", { title: "   " });
    expect(invalid).toMatchObject({ ok: false, reason: "Issue title is required." });

    const updated = updateIssue(initial, "issue-bas-103", {
      title: " Configure retry controls ",
      description: "Expose retry count and backoff.",
      priority: "High",
      labels: ["canvas", "ux", "ux"],
      module: "Workflow builder",
      cycle: "Cycle 04",
      assignee: "Luke",
      branch: "codex/bas-103-retry-controls",
      dependencies: ["issue-bas-101"],
    });

    expect(updated).toMatchObject({
      ok: true,
      issue: {
        title: "Configure retry controls",
        description: "Expose retry count and backoff.",
        priority: "High",
        labels: ["canvas", "ux"],
        cycle: "Cycle 04",
        assignee: "Luke",
        branch: "codex/bas-103-retry-controls",
        dependencies: ["issue-bas-101"],
      },
    });
  });

  it("dequeues reserved work back to Ready without losing its run audit record", () => {
    const initial = createIssueRepositoryState(baseWorkspaceRepository.read());
    const result = dequeueIssue(initial, "issue-bas-105");

    expect(result).toMatchObject({
      ok: true,
      issue: {
        status: "Ready",
        runState: "idle",
        queuePosition: null,
        latestRunId: "RUN-2047",
      },
    });
    expect(result.state.runs.find(({ id }) => id === "RUN-2047")).toMatchObject({
      status: "Failed",
      currentStep: "Dequeued before execution",
    });
  });

  it("keeps the project run synchronized when an executing issue changes status", () => {
    const initial = createIssueRepositoryState(baseWorkspaceRepository.read());
    const running = transitionIssue(initial, "issue-bas-105", "Running");

    expect(running).toMatchObject({ ok: true, issue: { status: "Running", runState: "running" } });
    expect(running.state.runs.find(({ id }) => id === "RUN-2047")).toMatchObject({
      projectId: "project-base-desktop",
      status: "Running",
      currentStep: "Agent execution",
    });
  });

  it("allocates queue positions inside the issue project", () => {
    const initial = createIssueRepositoryState(baseWorkspaceRepository.read());
    const result = queueIssues(initial, ["issue-rly-1"]);

    expect(result.state.issues.find(({ id }) => id === "issue-rly-1")).toMatchObject({
      queuePosition: 2,
      status: "Queued",
    });
    expect(result.state.runs.at(-1)).toMatchObject({ projectId: "project-base-relay" });
  });

  it("creates dynamic built-in views for every project without crossing project boundaries", () => {
    const snapshot = baseWorkspaceRepository.read();
    const views = createDefaultIssueViews(snapshot.projects);
    const desktopAll = views.find(({ id }) => id === "view-project-base-desktop-all");
    const desktopReady = views.find(({ id }) => id === "view-project-base-desktop-ready");
    const relayReady = views.find(({ id }) => id === "view-project-base-relay-ready");

    expect(views.filter(({ projectId }) => projectId === "project-base-desktop")).toHaveLength(4);
    expect(desktopAll).toMatchObject({ groupBy: "status", layout: "list" });
    expect(
      resolveIssueView(snapshot.issues, desktopReady!).map(({ identifier }) => identifier),
    ).toEqual(["BAS-101"]);
    expect(
      resolveIssueView(snapshot.issues, relayReady!).map(({ identifier }) => identifier),
    ).toEqual(["RLY-1"]);
  });

  it("treats saved views as live queries over current issue state", () => {
    const snapshot = baseWorkspaceRepository.read();
    const readyView = createDefaultIssueViews(snapshot.projects).find(
      ({ id }) => id === "view-project-base-desktop-ready",
    )!;
    const changedIssues = snapshot.issues.map((issue) =>
      issue.id === "issue-bas-103" ? { ...issue, status: "Ready" as const } : issue,
    );

    expect(resolveIssueView(changedIssues, readyView).map(({ identifier }) => identifier)).toEqual([
      "BAS-101",
      "BAS-103",
    ]);
  });

  it("creates project-scoped saved views with deterministic collision-safe identifiers", () => {
    const snapshot = baseWorkspaceRepository.read();
    const views = createDefaultIssueViews(snapshot.projects);
    const input = {
      projectId: "project-base-desktop",
      name: "Release blockers",
      description: "Urgent issues blocking the release.",
      layout: "list" as const,
      groupBy: "priority" as const,
      filters: { ...DEFAULT_ISSUE_FILTERS, priority: "Urgent" as const },
    };
    const first = createIssueView(views, input);
    const second = createIssueView([...views, first], input);

    expect(first).toMatchObject({
      id: "view-project-base-desktop-release-blockers",
      kind: "saved",
      projectId: "project-base-desktop",
      description: "Urgent issues blocking the release.",
    });
    expect(second.id).toBe("view-project-base-desktop-release-blockers-2");
  });

  it("groups a project collection deterministically without copying issues", () => {
    const snapshot = baseWorkspaceRepository.read();
    const projectIssues = filterIssues(
      snapshot.issues,
      "project-base-desktop",
      DEFAULT_ISSUE_FILTERS,
    );
    const groups = groupIssues(projectIssues, "status");

    expect(groups.map(({ key }) => key)).toEqual([
      "Backlog",
      "Ready",
      "Queued",
      "Running",
      "Review",
    ]);
    expect(groups.find(({ key }) => key === "Ready")?.issues[0]).toBe(projectIssues[0]);
  });

  it("applies reusable issue-template defaults while preserving an entered title", () => {
    const bugTemplate = BASE_ISSUE_TEMPLATES.find(({ id }) => id === "issue-template-bug")!;
    const draft = applyIssueTemplate(
      {
        title: "Fix queue ordering",
        description: "",
        status: "Backlog",
        priority: "None",
        labels: [],
        module: "",
        cycle: "",
        assignee: "",
        workflowId: null,
      },
      bugTemplate,
    );

    expect(draft).toMatchObject({
      title: "Fix queue ordering",
      status: "Planned",
      priority: "High",
      labels: ["bug", "regression"],
      workflowId: "workflow-bug-fix",
    });
  });

  it("materializes and queues a saved view through the normal project run rules", () => {
    const snapshot = baseWorkspaceRepository.read();
    const initial = createIssueRepositoryState(snapshot);
    const readyView = createDefaultIssueViews(snapshot.projects).find(
      ({ id }) => id === "view-project-base-desktop-ready",
    )!;
    const result = queueIssueView(initial, readyView);

    expect(result.queuedIds).toEqual(["issue-bas-101"]);
    expect(result.state.runs.at(-1)).toMatchObject({
      projectId: "project-base-desktop",
      issueId: "issue-bas-101",
    });
  });

  it("runs a collection with an explicit reusable workflow without rewriting issue defaults", () => {
    const snapshot = baseWorkspaceRepository.read();
    const initial = createIssueRepositoryState({
      ...snapshot,
      issues: snapshot.issues.map((issue) =>
        issue.id === "issue-bas-101" ? { ...issue, workflowId: null } : issue,
      ),
    });
    const result = queueIssues(initial, ["issue-bas-101"], "workflow-bug-fix");

    expect(result.queuedIds).toEqual(["issue-bas-101"]);
    expect(result.state.issues.find(({ id }) => id === "issue-bas-101")?.workflowId).toBeNull();
    expect(result.state.runs.at(-1)).toMatchObject({
      projectId: "project-base-desktop",
      workflowId: "workflow-bug-fix",
    });
  });
});

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { resolveStorage } from "~/lib/storage";

import {
  DEFAULT_ISSUE_GROUP_BY,
  DEFAULT_ISSUE_FILTERS,
  assignIssueWorkflow,
  createDefaultIssueViews,
  createIssue,
  createIssueRepositoryState,
  createIssueView,
  dequeueIssue,
  queueIssues,
  transitionIssue,
  updateIssue,
  type CreateIssueInput,
  type BaseIssueView,
  type IssueFilters,
  type IssueMutationResult,
  type IssueRepositoryState,
  type IssueViewGroupBy,
  type QueueIssuesResult,
  type UpdateIssueInput,
} from "./issueRepository";
import {
  baseWorkspaceRepository,
  type BaseIssueStatus,
  type BaseIssueSummary,
  type BaseRunSummary,
} from "./workspaceRepository";

export type IssueUiIntent =
  | { readonly id: number; readonly type: "create"; readonly projectId: string }
  | { readonly id: number; readonly type: "filters"; readonly projectId: string }
  | { readonly id: number; readonly type: "search"; readonly projectId: string }
  | {
      readonly id: number;
      readonly type: "queue-view";
      readonly projectId: string;
      readonly issueIds: readonly string[];
    };
export type IssueUiIntentRequest = IssueUiIntent extends infer Intent
  ? Intent extends { readonly id: number }
    ? Omit<Intent, "id">
    : never
  : never;

interface IssueWorkspaceStore extends IssueRepositoryState {
  readonly views: readonly BaseIssueView[];
  readonly filtersByProject: Readonly<Record<string, IssueFilters>>;
  readonly groupByByProject: Readonly<Record<string, IssueViewGroupBy>>;
  readonly activeViewIdByProject: Readonly<Record<string, string | null>>;
  readonly uiIntent: IssueUiIntent | null;
  readonly selectedIssueId: string | null;
  readonly selectedIssueIds: readonly string[];
  readonly createIssue: (input: CreateIssueInput) => BaseIssueSummary;
  readonly updateIssue: (issueId: string, input: UpdateIssueInput) => IssueMutationResult;
  readonly assignWorkflow: (issueId: string, workflowId: string | null) => IssueMutationResult;
  readonly transitionIssue: (issueId: string, status: BaseIssueStatus) => IssueMutationResult;
  readonly queueIssues: (
    issueIds: readonly string[],
    workflowIdOverride?: string,
  ) => QueueIssuesResult;
  readonly dequeueIssue: (issueId: string) => IssueMutationResult;
  readonly syncWorkflowCatalog: (
    workflows: readonly {
      readonly id: string;
      readonly version: number | null;
      readonly executable: boolean;
      readonly name: string;
    }[],
  ) => void;
  readonly setFilters: (projectId: string, filters: Partial<IssueFilters>) => void;
  readonly resetFilters: (projectId: string) => void;
  readonly setGroupBy: (projectId: string, groupBy: IssueViewGroupBy) => void;
  readonly activateView: (projectId: string, viewId: string) => BaseIssueView | null;
  readonly saveView: (input: Omit<BaseIssueView, "id" | "kind">) => BaseIssueView;
  readonly requestUiIntent: (intent: IssueUiIntentRequest) => void;
  readonly consumeUiIntent: (intentId: number) => void;
  readonly selectIssue: (issueId: string | null) => void;
  readonly toggleIssueSelection: (issueId: string, selected: boolean) => void;
  readonly setIssueSelection: (issueIds: readonly string[], selected: boolean) => void;
  readonly clearIssueSelection: () => void;
}

const initialRepositoryState = createIssueRepositoryState(baseWorkspaceRepository.read());
const initialSnapshot = baseWorkspaceRepository.read();
const initialViews = createDefaultIssueViews(initialSnapshot.projects);
const initialFiltersByProject: Readonly<Record<string, IssueFilters>> = Object.fromEntries(
  initialSnapshot.projects.map(({ id }) => [id, DEFAULT_ISSUE_FILTERS]),
);
const initialGroupByByProject: Readonly<Record<string, IssueViewGroupBy>> = Object.fromEntries(
  initialSnapshot.projects.map(({ id }) => [id, DEFAULT_ISSUE_GROUP_BY]),
);
const initialActiveViewIdByProject: Readonly<Record<string, string | null>> = Object.fromEntries(
  initialSnapshot.projects.map(({ id }) => [id, `view-${id}-all`]),
);

function migrateIssueWorkspaceState(persistedState: unknown): Partial<IssueWorkspaceStore> {
  if (typeof persistedState !== "object" || persistedState === null) return {};
  const state = persistedState as Partial<IssueWorkspaceStore>;
  const persistedRuns = (persistedState as { readonly runs?: unknown }).runs;
  if (!Array.isArray(persistedRuns)) return state;
  const workflowNameById = {
    ...initialRepositoryState.workflowNameById,
    ...state.workflowNameById,
  };
  const runs = persistedRuns.map((run): BaseRunSummary | unknown => {
    if (
      typeof run !== "object" ||
      run === null ||
      !("workflowId" in run) ||
      typeof run.workflowId !== "string"
    ) {
      return run;
    }
    if ("workflowName" in run && typeof run.workflowName === "string" && run.workflowName.trim()) {
      return run;
    }
    return {
      ...run,
      workflowName: workflowNameById[run.workflowId] ?? run.workflowId,
    } as BaseRunSummary;
  });
  return { ...state, runs: runs as readonly BaseRunSummary[] };
}

function repositoryState(state: IssueWorkspaceStore): IssueRepositoryState {
  return {
    issues: state.issues,
    runs: state.runs,
    workflowIds: state.workflowIds,
    workflowVersionById: state.workflowVersionById,
    workflowExecutableById: state.workflowExecutableById,
    workflowNameById: state.workflowNameById,
    nextIssueNumberByProject: state.nextIssueNumberByProject,
    nextRunNumber: state.nextRunNumber,
  };
}

export const useIssueWorkspaceStore = create<IssueWorkspaceStore>()(
  persist(
    (set, get) => {
      const commitIssueMutation = (
        operation: (state: IssueRepositoryState) => IssueMutationResult,
      ): IssueMutationResult => {
        const result = operation(repositoryState(get()));
        if (result.ok) set(result.state);
        return result;
      };

      return {
        ...initialRepositoryState,
        views: initialViews,
        filtersByProject: initialFiltersByProject,
        groupByByProject: initialGroupByByProject,
        activeViewIdByProject: initialActiveViewIdByProject,
        uiIntent: null,
        selectedIssueId: null,
        selectedIssueIds: [],
        createIssue: (input) => {
          const result = createIssue(repositoryState(get()), input);
          set({ ...result.state, selectedIssueId: result.issue.id });
          return result.issue;
        },
        updateIssue: (issueId, input) =>
          commitIssueMutation((state) => updateIssue(state, issueId, input)),
        assignWorkflow: (issueId, workflowId) =>
          commitIssueMutation((state) => assignIssueWorkflow(state, issueId, workflowId)),
        transitionIssue: (issueId, status) =>
          commitIssueMutation((state) => transitionIssue(state, issueId, status)),
        queueIssues: (issueIds, workflowIdOverride) => {
          const current = get();
          const result = queueIssues(repositoryState(current), issueIds, workflowIdOverride);
          set({
            ...result.state,
            selectedIssueIds: current.selectedIssueIds.filter(
              (issueId) => !result.queuedIds.includes(issueId),
            ),
          });
          return result;
        },
        dequeueIssue: (issueId) => commitIssueMutation((state) => dequeueIssue(state, issueId)),
        syncWorkflowCatalog: (workflows) =>
          set((state) => {
            const workflowIds = workflows.map(({ id }) => id);
            const workflowVersionById = Object.fromEntries(
              workflows.map(({ id, version }) => [id, version]),
            );
            const workflowExecutableById = Object.fromEntries(
              workflows.map(({ executable, id }) => [id, executable]),
            );
            const workflowNameById = Object.fromEntries(
              workflows.map(({ id, name }) => [id, name]),
            );
            if (
              JSON.stringify(state.workflowIds) === JSON.stringify(workflowIds) &&
              JSON.stringify(state.workflowVersionById) === JSON.stringify(workflowVersionById) &&
              JSON.stringify(state.workflowExecutableById) ===
                JSON.stringify(workflowExecutableById) &&
              JSON.stringify(state.workflowNameById) === JSON.stringify(workflowNameById)
            ) {
              return state;
            }
            return {
              workflowIds,
              workflowVersionById,
              workflowExecutableById,
              workflowNameById,
            };
          }),
        setFilters: (projectId, filters) =>
          set((state) => ({
            filtersByProject: {
              ...state.filtersByProject,
              [projectId]: {
                ...(state.filtersByProject[projectId] ?? DEFAULT_ISSUE_FILTERS),
                ...filters,
              },
            },
            activeViewIdByProject: { ...state.activeViewIdByProject, [projectId]: null },
          })),
        resetFilters: (projectId) =>
          set((state) => ({
            filtersByProject: { ...state.filtersByProject, [projectId]: DEFAULT_ISSUE_FILTERS },
            activeViewIdByProject: { ...state.activeViewIdByProject, [projectId]: null },
          })),
        setGroupBy: (projectId, groupBy) =>
          set((state) => ({
            groupByByProject: { ...state.groupByByProject, [projectId]: groupBy },
            activeViewIdByProject: { ...state.activeViewIdByProject, [projectId]: null },
          })),
        activateView: (projectId, viewId) => {
          const view = get().views.find(
            (candidate) => candidate.id === viewId && candidate.projectId === projectId,
          );
          if (!view) return null;
          set((state) => ({
            filtersByProject: { ...state.filtersByProject, [projectId]: view.filters },
            groupByByProject: { ...state.groupByByProject, [projectId]: view.groupBy },
            activeViewIdByProject: { ...state.activeViewIdByProject, [projectId]: view.id },
          }));
          return view;
        },
        saveView: (input) => {
          let savedView: BaseIssueView | null = null;
          set((state) => {
            savedView = createIssueView(state.views, input);
            return {
              views: [...state.views, savedView],
              filtersByProject: {
                ...state.filtersByProject,
                [savedView.projectId]: savedView.filters,
              },
              groupByByProject: {
                ...state.groupByByProject,
                [savedView.projectId]: savedView.groupBy,
              },
              activeViewIdByProject: {
                ...state.activeViewIdByProject,
                [savedView.projectId]: savedView.id,
              },
            };
          });
          if (!savedView) throw new Error("Issue view creation did not complete");
          return savedView;
        },
        requestUiIntent: (intent) =>
          set((state) => ({
            uiIntent: { ...intent, id: (state.uiIntent?.id ?? 0) + 1 } as IssueUiIntent,
          })),
        consumeUiIntent: (intentId) =>
          set((state) => ({ uiIntent: state.uiIntent?.id === intentId ? null : state.uiIntent })),
        selectIssue: (selectedIssueId) => set({ selectedIssueId }),
        toggleIssueSelection: (issueId, selected) =>
          set((state) => ({
            selectedIssueIds: selected
              ? [...new Set([...state.selectedIssueIds, issueId])]
              : state.selectedIssueIds.filter((candidate) => candidate !== issueId),
          })),
        setIssueSelection: (issueIds, selected) =>
          set((state) => ({
            selectedIssueIds: selected
              ? [...new Set([...state.selectedIssueIds, ...issueIds])]
              : state.selectedIssueIds.filter((issueId) => !issueIds.includes(issueId)),
          })),
        clearIssueSelection: () => set({ selectedIssueIds: [] }),
      };
    },
    {
      name: "base:issue-workspace:v2",
      version: 3,
      storage: createJSONStorage(() =>
        resolveStorage(typeof window !== "undefined" ? window.localStorage : undefined),
      ),
      partialize: (state) => ({
        issues: state.issues,
        runs: state.runs,
        workflowIds: state.workflowIds,
        workflowVersionById: state.workflowVersionById,
        workflowExecutableById: state.workflowExecutableById,
        workflowNameById: state.workflowNameById,
        nextIssueNumberByProject: state.nextIssueNumberByProject,
        nextRunNumber: state.nextRunNumber,
        views: state.views,
        filtersByProject: state.filtersByProject,
        groupByByProject: state.groupByByProject,
        activeViewIdByProject: state.activeViewIdByProject,
        selectedIssueId: state.selectedIssueId,
      }),
      migrate: migrateIssueWorkspaceState,
    },
  ),
);

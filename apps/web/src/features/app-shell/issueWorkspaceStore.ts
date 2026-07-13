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

function repositoryState(state: IssueWorkspaceStore): IssueRepositoryState {
  return {
    issues: state.issues,
    runs: state.runs,
    nextIssueNumberByProject: state.nextIssueNumberByProject,
    nextRunNumber: state.nextRunNumber,
  };
}

export const useIssueWorkspaceStore = create<IssueWorkspaceStore>()(
  persist(
    (set, get) => ({
      ...initialRepositoryState,
      views: initialViews,
      filtersByProject: initialFiltersByProject,
      groupByByProject: initialGroupByByProject,
      activeViewIdByProject: initialActiveViewIdByProject,
      uiIntent: null,
      selectedIssueId: null,
      selectedIssueIds: [],
      createIssue: (input) => {
        let createdIssue: BaseIssueSummary | null = null;
        set((state) => {
          const result = createIssue(repositoryState(state), input);
          createdIssue = result.issue;
          return { ...result.state, selectedIssueId: result.issue.id };
        });
        if (!createdIssue) throw new Error("Issue creation did not complete");
        return createdIssue;
      },
      updateIssue: (issueId, input) => {
        let result: IssueMutationResult | null = null;
        set((state) => {
          result = updateIssue(repositoryState(state), issueId, input);
          return result.ok ? result.state : state;
        });
        if (!result) throw new Error("Issue update did not complete");
        return result;
      },
      assignWorkflow: (issueId, workflowId) => {
        let result: IssueMutationResult | null = null;
        set((state) => {
          result = assignIssueWorkflow(repositoryState(state), issueId, workflowId);
          return result.ok ? result.state : state;
        });
        if (!result) throw new Error("Workflow assignment did not complete");
        return result;
      },
      transitionIssue: (issueId, status) => {
        let result: IssueMutationResult | null = null;
        set((state) => {
          result = transitionIssue(repositoryState(state), issueId, status);
          return result.ok ? result.state : state;
        });
        if (!result) throw new Error("Issue transition did not complete");
        return result;
      },
      queueIssues: (issueIds, workflowIdOverride) => {
        let result: QueueIssuesResult | null = null;
        set((state) => {
          result = queueIssues(repositoryState(state), issueIds, workflowIdOverride);
          return {
            ...result.state,
            selectedIssueIds: state.selectedIssueIds.filter(
              (issueId) => !result?.queuedIds.includes(issueId),
            ),
          };
        });
        if (!result) throw new Error("Issue queueing did not complete");
        return result;
      },
      dequeueIssue: (issueId) => {
        let result: IssueMutationResult | null = null;
        set((state) => {
          result = dequeueIssue(repositoryState(state), issueId);
          return result.ok ? result.state : state;
        });
        if (!result) throw new Error("Issue dequeue did not complete");
        return result;
      },
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
    }),
    {
      name: "base:issue-workspace:v2",
      version: 2,
      storage: createJSONStorage(() =>
        resolveStorage(typeof window !== "undefined" ? window.localStorage : undefined),
      ),
      partialize: (state) => ({
        issues: state.issues,
        runs: state.runs,
        nextIssueNumberByProject: state.nextIssueNumberByProject,
        nextRunNumber: state.nextRunNumber,
        views: state.views,
        filtersByProject: state.filtersByProject,
        groupByByProject: state.groupByByProject,
        activeViewIdByProject: state.activeViewIdByProject,
        selectedIssueId: state.selectedIssueId,
      }),
    },
  ),
);

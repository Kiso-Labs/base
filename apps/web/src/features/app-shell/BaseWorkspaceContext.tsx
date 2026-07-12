import { createContext, use, useMemo, useState, type ReactNode } from "react";

import {
  baseWorkspaceRepository,
  type BaseProject,
  type BaseRepository,
  type BaseWorkspaceRepository,
  type BaseWorkspaceSnapshot,
} from "./workspaceRepository";

const SELECTED_PROJECT_STORAGE_KEY = "base:selected-project";

interface BaseWorkspaceContextValue {
  readonly snapshot: BaseWorkspaceSnapshot;
  readonly selectedProject: BaseProject;
  readonly selectedRepository: BaseRepository;
  readonly selectProject: (projectId: string) => void;
}

const BaseWorkspaceContext = createContext<BaseWorkspaceContextValue | null>(null);

function readInitialProjectId(repository: BaseWorkspaceRepository): string {
  let savedProjectId: string | null = null;
  if (typeof window !== "undefined") {
    try {
      savedProjectId = window.localStorage.getItem(SELECTED_PROJECT_STORAGE_KEY);
    } catch {
      // Storage can be unavailable in restricted contexts; project selection still works in memory.
    }
  }
  if (savedProjectId && repository.getProject(savedProjectId)) {
    return savedProjectId;
  }

  const firstProject = repository.read().projects[0];
  if (!firstProject) {
    throw new Error("Base requires at least one workspace project");
  }
  return firstProject.id;
}

function persistSelectedProjectId(projectId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(SELECTED_PROJECT_STORAGE_KEY, projectId);
  } catch {
    // Ignore quota and storage errors so the authenticated shell remains usable.
  }
}

export function BaseWorkspaceProvider({
  children,
  repository = baseWorkspaceRepository,
}: {
  readonly children: ReactNode;
  readonly repository?: BaseWorkspaceRepository;
}) {
  const snapshot = repository.read();
  const [selectedProjectId, setSelectedProjectId] = useState(() =>
    readInitialProjectId(repository),
  );
  const selectedProject = repository.getProject(selectedProjectId) ?? snapshot.projects[0];
  if (!selectedProject) {
    throw new Error("Base requires at least one workspace project");
  }

  const selectedRepository = snapshot.repositories.find(
    ({ id }) => id === selectedProject.repositoryId,
  );
  if (!selectedRepository) {
    throw new Error(`Repository ${selectedProject.repositoryId} is missing`);
  }

  const value = useMemo<BaseWorkspaceContextValue>(
    () => ({
      snapshot,
      selectedProject,
      selectedRepository,
      selectProject: (projectId) => {
        if (!repository.getProject(projectId)) {
          return;
        }
        setSelectedProjectId(projectId);
        persistSelectedProjectId(projectId);
      },
    }),
    [repository, selectedProject, selectedRepository, snapshot],
  );

  return <BaseWorkspaceContext value={value}>{children}</BaseWorkspaceContext>;
}

export function useBaseWorkspace(): BaseWorkspaceContextValue {
  const value = use(BaseWorkspaceContext);
  if (!value) {
    throw new Error("useBaseWorkspace must be used inside BaseWorkspaceProvider");
  }
  return value;
}

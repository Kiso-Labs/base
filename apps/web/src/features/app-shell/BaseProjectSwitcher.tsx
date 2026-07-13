import { CheckIcon, ChevronDownIcon, GitBranchIcon } from "lucide-react";

import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
} from "~/components/ui/menu";
import { cn } from "~/lib/utils";

import { useBaseWorkspace } from "./BaseWorkspaceContext";

export function BaseProjectSwitcher({ className }: { readonly className?: string }) {
  const { selectedProject, selectedRepository, selectProject, snapshot } = useBaseWorkspace();

  return (
    <Menu>
      <MenuTrigger
        render={
          <button
            type="button"
            className={cn(
              "group flex w-full items-center gap-2 rounded-md border border-border/70 bg-background/35 px-2 py-2 text-left outline-hidden transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
              className,
            )}
            aria-label="Switch project"
          />
        }
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-[5px] border border-border bg-card text-[11px] font-semibold text-foreground shadow-sm/5">
          {selectedProject.identifier.slice(0, 1)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium text-foreground">
            {selectedProject.name}
          </span>
          <span className="mt-0.5 flex items-center gap-1 truncate font-mono text-[10px] text-muted-foreground/75">
            <GitBranchIcon className="size-3 shrink-0" />
            {selectedRepository.fullName}
          </span>
        </span>
        <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-popup-open:rotate-180" />
      </MenuTrigger>
      <MenuPopup align="start" className="w-64" sideOffset={5}>
        <MenuGroup>
          <MenuGroupLabel>Kiso Labs projects</MenuGroupLabel>
          <MenuRadioGroup value={selectedProject.id} onValueChange={selectProject}>
            {snapshot.projects.map((project) => {
              const repository = snapshot.repositories.find(
                ({ id }) => id === project.repositoryId,
              );
              return (
                <MenuRadioItem className="gap-2.5" key={project.id} value={project.id}>
                  <span className="flex size-6 items-center justify-center rounded-[5px] border border-border bg-card text-[10px] font-semibold">
                    {project.identifier.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium">{project.name}</span>
                    <span className="block truncate font-mono text-[10px] text-muted-foreground">
                      {repository?.fullName ?? "Repository unavailable"}
                    </span>
                  </span>
                  {project.id === selectedProject.id ? (
                    <CheckIcon className="size-3.5 text-primary" />
                  ) : null}
                </MenuRadioItem>
              );
            })}
          </MenuRadioGroup>
        </MenuGroup>
      </MenuPopup>
    </Menu>
  );
}

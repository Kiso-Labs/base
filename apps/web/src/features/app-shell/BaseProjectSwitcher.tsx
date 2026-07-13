import { ChevronsUpDownIcon, GitBranchIcon } from "lucide-react";

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
              "group flex h-10 w-full items-center gap-2 rounded-lg px-2 text-left outline-hidden transition-colors hover:bg-accent/70 focus-visible:ring-2 focus-visible:ring-ring",
              className,
            )}
            aria-label="Switch project"
          />
        }
      >
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-foreground text-[10px] font-semibold text-background shadow-sm ring-1 ring-foreground/10">
          {selectedProject.identifier.slice(0, 1)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-medium leading-4 text-foreground">
            {selectedProject.name}
          </span>
          <span className="flex items-center gap-1 truncate text-[10px] leading-3.5 text-muted-foreground/70">
            <GitBranchIcon className="size-2.5 shrink-0" />
            {selectedRepository.fullName}
          </span>
        </span>
        <ChevronsUpDownIcon className="size-3 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-muted-foreground" />
      </MenuTrigger>
      <MenuPopup align="start" className="w-64 p-1" sideOffset={4}>
        <MenuGroup>
          <MenuGroupLabel className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/65">
            {snapshot.workspace.name} projects
          </MenuGroupLabel>
          <MenuRadioGroup value={selectedProject.id} onValueChange={selectProject}>
            {snapshot.projects.map((project) => {
              const repository = snapshot.repositories.find(
                ({ id }) => id === project.repositoryId,
              );
              return (
                <MenuRadioItem
                  className="min-h-10 gap-2 rounded-md px-2 py-1.5 data-[checked]:bg-accent"
                  key={project.id}
                  value={project.id}
                >
                  <span className="flex size-6 items-center justify-center rounded-md bg-foreground text-[9px] font-semibold text-background ring-1 ring-foreground/10">
                    {project.identifier.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-medium leading-4">
                      {project.name}
                    </span>
                    <span className="block truncate text-[10px] leading-3.5 text-muted-foreground">
                      {repository?.fullName ?? "Repository unavailable"}
                    </span>
                  </span>
                </MenuRadioItem>
              );
            })}
          </MenuRadioGroup>
        </MenuGroup>
      </MenuPopup>
    </Menu>
  );
}

import { ChevronRightIcon } from "lucide-react";

import { DialogDescription, DialogHeader, DialogTitle } from "~/components/ui/dialog";

export function IssueDialogHeader({
  description,
  label,
  projectIdentifier,
  projectName,
}: {
  readonly description: string;
  readonly label: string;
  readonly projectIdentifier: string;
  readonly projectName: string;
}) {
  return (
    <DialogHeader className="border-b border-border/50 px-6 py-4 pe-14">
      <DialogTitle className="flex min-w-0 items-center gap-2 text-sm font-medium">
        <span
          className="flex shrink-0 items-center gap-2 rounded-full border border-border/60 bg-muted/50 px-2.5 py-1 font-mono text-[11px] font-semibold text-muted-foreground"
          title={projectName}
        >
          <span className="size-1.5 rounded-full bg-primary" />
          {projectIdentifier}
        </span>
        <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground/60" />
        <span className="truncate text-foreground/90">{label}</span>
      </DialogTitle>
      <DialogDescription className="sr-only">{description}</DialogDescription>
    </DialogHeader>
  );
}

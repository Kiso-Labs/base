import { CircleDashedIcon, EllipsisIcon, SignalIcon, TagIcon, UserRoundIcon } from "lucide-react";
import type { FormEventHandler, ReactNode } from "react";

import { Button } from "~/components/ui/button";
import { DialogFooter, DialogPanel } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";

import { IssueMarkdownEditor } from "./IssueMarkdownEditor";
import { IssuePropertySelect, type IssuePropertyOption } from "./IssuePropertySelect";

export function IssueDialogForm({
  autoFocusTitle = false,
  children,
  description,
  descriptionId,
  formId,
  onDescriptionChange,
  onSubmit,
  onTitleChange,
  title,
  titleError,
  titleId,
}: {
  readonly autoFocusTitle?: boolean;
  readonly children: ReactNode;
  readonly description: string;
  readonly descriptionId: string;
  readonly formId: string;
  readonly onDescriptionChange: (value: string) => void;
  readonly onSubmit: FormEventHandler<HTMLFormElement>;
  readonly onTitleChange: (value: string) => void;
  readonly title: string;
  readonly titleError?: string | null;
  readonly titleId: string;
}) {
  return (
    <DialogPanel className="p-0" scrollFade={false}>
      <form
        className="flex min-h-full flex-col px-7 py-6 sm:px-10 sm:py-8"
        id={formId}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.requestSubmit();
          }
        }}
        onSubmit={onSubmit}
      >
        <div>
          <Input
            aria-invalid={titleError ? true : undefined}
            aria-label="Issue title"
            autoFocus={autoFocusTitle}
            className="h-14 rounded-none border-0 bg-transparent px-0 font-heading text-2xl font-semibold shadow-none before:hidden placeholder:text-muted-foreground/55 has-focus-visible:border-transparent has-focus-visible:ring-0 sm:text-3xl"
            id={titleId}
            onChange={(event) => onTitleChange(event.currentTarget.value)}
            placeholder="Issue title"
            unstyled
            value={title}
          />
          {titleError ? <p className="text-xs text-destructive-foreground">{titleError}</p> : null}
          <IssueMarkdownEditor
            className="mt-3 min-h-56"
            id={descriptionId}
            onChange={onDescriptionChange}
            placeholder="Add description… Markdown is supported"
            value={description}
          />
        </div>
        {children}
      </form>
    </DialogPanel>
  );
}

export function IssuePropertyBar({ children }: { readonly children: ReactNode }) {
  return <div className="mt-auto flex flex-wrap items-center gap-2 pt-8">{children}</div>;
}

export function IssuePropertyButton({
  accessibleLabel,
  children,
  icon,
  onClick,
}: {
  readonly accessibleLabel: string;
  readonly children: ReactNode;
  readonly icon: ReactNode;
  readonly onClick: () => void;
}) {
  return (
    <Button
      aria-label={accessibleLabel}
      className="max-w-48 rounded-full border-border/60 bg-muted/45 px-3 text-muted-foreground shadow-none hover:bg-muted/70 hover:text-foreground"
      onClick={onClick}
      size="sm"
      type="button"
      variant="outline"
    >
      {icon}
      <span className="truncate">{children}</span>
    </Button>
  );
}

export function IssueCorePropertyBar({
  assignee,
  expanded,
  labels,
  moreAccessibleLabel,
  onExpand,
  onPriorityChange,
  onStatusChange,
  onToggleMore,
  priority,
  priorityOptions,
  status,
  statusOptions,
}: {
  readonly assignee: string;
  readonly expanded: boolean;
  readonly labels: string;
  readonly moreAccessibleLabel: string;
  readonly onExpand: () => void;
  readonly onPriorityChange: (value: string) => void;
  readonly onStatusChange: (value: string) => void;
  readonly onToggleMore: () => void;
  readonly priority: string;
  readonly priorityOptions: readonly IssuePropertyOption[];
  readonly status: string;
  readonly statusOptions: readonly IssuePropertyOption[];
}) {
  return (
    <IssuePropertyBar>
      <IssuePropertySelect
        icon={<CircleDashedIcon />}
        label="Status"
        onValueChange={onStatusChange}
        options={statusOptions}
        size="sm"
        value={status}
        variant="pill"
      />
      <IssuePropertySelect
        icon={<SignalIcon />}
        label="Priority"
        onValueChange={onPriorityChange}
        options={priorityOptions}
        size="sm"
        value={priority}
        variant="pill"
      />
      <IssuePropertyButton
        accessibleLabel="Edit assignee"
        icon={<UserRoundIcon />}
        onClick={onExpand}
      >
        {assignee.trim() && assignee !== "Unassigned" ? assignee : "Assignee"}
      </IssuePropertyButton>
      <IssuePropertyButton accessibleLabel="Edit labels" icon={<TagIcon />} onClick={onExpand}>
        {labels.trim() || "Labels"}
      </IssuePropertyButton>
      <Button
        aria-expanded={expanded}
        aria-label={moreAccessibleLabel}
        className="rounded-full"
        onClick={onToggleMore}
        size="icon-sm"
        type="button"
        variant="outline"
      >
        <EllipsisIcon />
      </Button>
    </IssuePropertyBar>
  );
}

export function IssueDialogActions({ children }: { readonly children: ReactNode }) {
  return (
    <DialogFooter className="items-center border-t border-border/50 bg-background/95 px-6 py-3 sm:justify-between">
      <span className="hidden text-xs text-muted-foreground sm:block">
        Markdown renders automatically when you leave the description.
      </span>
      <div className="flex w-full items-center justify-end gap-2 sm:w-auto">{children}</div>
    </DialogFooter>
  );
}

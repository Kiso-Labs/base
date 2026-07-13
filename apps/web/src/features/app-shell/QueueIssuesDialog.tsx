import { ListChecksIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "~/components/ui/dialog";
import { toastManager } from "~/components/ui/toast";

import { useBaseWorkspace } from "./BaseWorkspaceContext";
import { IssuePropertySelect } from "./IssuePropertySelect";
import { useIssueWorkspaceStore } from "./issueWorkspaceStore";

export function QueueIssuesDialog({
  issueIds,
  onOpenChange,
  open,
}: {
  readonly issueIds: readonly string[];
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
}) {
  const { snapshot } = useBaseWorkspace();
  const allIssues = useIssueWorkspaceStore((state) => state.issues);
  const issues = allIssues.filter(({ id }) => issueIds.includes(id));
  const queueIssues = useIssueWorkspaceStore((state) => state.queueIssues);
  const [workflowId, setWorkflowId] = useState("issue-defaults");

  useEffect(() => {
    if (open) setWorkflowId("issue-defaults");
  }, [open]);

  const confirm = () => {
    const result = queueIssues(issueIds, workflowId === "issue-defaults" ? undefined : workflowId);
    if (result.queuedIds.length > 0) {
      const selectedWorkflow = snapshot.workflows.find(({ id }) => id === workflowId);
      toastManager.add({
        type: "success",
        title: `${result.queuedIds.length} issue${result.queuedIds.length === 1 ? "" : "s"} queued`,
        description:
          workflowId === "issue-defaults"
            ? "Project-scoped runs were created from each issue’s default workflow."
            : `${selectedWorkflow?.name ?? "The selected workflow"} created project-scoped runs without changing issue defaults.`,
      });
    }
    if (result.rejected.length > 0) {
      toastManager.add({
        type: "error",
        title: `${result.rejected.length} issue${result.rejected.length === 1 ? "" : "s"} not queued`,
        description: result.rejected.map(({ reason }) => reason).join(" "),
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>Run workflow on this collection?</DialogTitle>
          <DialogDescription>
            Base materializes the visible issues now and creates one project-scoped run per eligible
            issue. The saved view remains a live query.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <div className="mb-3 rounded-md border border-border/60 bg-muted/20 p-3">
            <IssuePropertySelect
              label="Workflow for this run"
              onValueChange={setWorkflowId}
              options={[
                { label: "Use each issue’s default workflow", value: "issue-defaults" },
                ...snapshot.workflows.map((workflow) => ({
                  label: workflow.name,
                  value: workflow.id,
                })),
              ]}
              value={workflowId}
            />
            <p className="mt-2 text-[10px] text-muted-foreground">
              Choosing a workflow here does not rewrite the issues’ default workflow assignment.
            </p>
          </div>
          <div className="divide-y divide-border/60 rounded-md border border-border/70">
            {issues.map((issue) => (
              <div className="flex items-center justify-between gap-3 px-3 py-2.5" key={issue.id}>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{issue.title}</p>
                  <p className="mt-0.5 font-mono text-[9px] text-muted-foreground">
                    {issue.identifier}
                  </p>
                </div>
                <Badge
                  size="sm"
                  variant={
                    workflowId !== "issue-defaults" || issue.workflowId ? "outline" : "warning"
                  }
                >
                  {workflowId !== "issue-defaults" || issue.workflowId
                    ? issue.status
                    : "No workflow"}
                </Badge>
              </div>
            ))}
          </div>
          {issues.length === 0 ? (
            <p className="text-sm text-muted-foreground">No issues are selected.</p>
          ) : null}
        </DialogPanel>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
            Cancel
          </Button>
          <Button disabled={issues.length === 0} onClick={confirm} type="button">
            <ListChecksIcon />
            Run on {issues.length || "selected"}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

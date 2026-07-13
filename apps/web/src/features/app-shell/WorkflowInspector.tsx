import { AlertTriangleIcon, PlusIcon, SaveIcon, Trash2Icon, XIcon } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";

import type {
  WorkflowDiagnostic,
  WorkflowNode,
  WorkflowRetryPolicy,
  WorkflowTriggerConfig,
} from "./workflowGraph";

const SELECT_CLASS_NAME =
  "h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Field({ children, label }: { readonly children: ReactNode; readonly label: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function numberFromInput(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function defaultTriggerConfig(event: WorkflowTriggerConfig["event"]): WorkflowTriggerConfig {
  switch (event) {
    case "manual":
    case "issue-queued":
      return { event };
    case "issue-status":
      return { event, status: "Ready" };
    case "repository":
      return { event, action: "pull-request" };
    case "schedule":
      return { event, cron: "0 9 * * 1-5", timezone: "America/Denver" };
    case "webhook":
      return { event, path: "/workflow-trigger" };
  }
}

function RetryFields({
  onChange,
  retry,
}: {
  readonly onChange: (retry: WorkflowRetryPolicy) => void;
  readonly retry: WorkflowRetryPolicy;
}) {
  return (
    <section className="rounded-lg border border-border/60 bg-muted/15 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Retry policy
        </p>
        <Badge size="sm" variant="outline">
          {retry.maxRetries} retries
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Attempts">
          <Input
            max={10}
            min={0}
            onChange={(event) =>
              onChange({
                ...retry,
                maxRetries: numberFromInput(event.currentTarget.value, retry.maxRetries),
              })
            }
            type="number"
            value={retry.maxRetries}
          />
        </Field>
        <Field label="Backoff">
          <select
            className={SELECT_CLASS_NAME}
            onChange={(event) =>
              onChange({ ...retry, strategy: event.currentTarget.value as "fixed" | "exponential" })
            }
            value={retry.strategy}
          >
            <option value="fixed">Fixed</option>
            <option value="exponential">Exponential</option>
          </select>
        </Field>
        <Field label="Delay (sec)">
          <Input
            min={1}
            onChange={(event) =>
              onChange({
                ...retry,
                delaySeconds: numberFromInput(event.currentTarget.value, retry.delaySeconds),
              })
            }
            type="number"
            value={retry.delaySeconds}
          />
        </Field>
        <Field label="Max delay">
          <Input
            min={1}
            onChange={(event) =>
              onChange({
                ...retry,
                maxDelaySeconds: numberFromInput(event.currentTarget.value, retry.maxDelaySeconds),
              })
            }
            type="number"
            value={retry.maxDelaySeconds}
          />
        </Field>
      </div>
    </section>
  );
}

function NodeConfiguration({
  node,
  onChange,
}: {
  readonly node: WorkflowNode;
  readonly onChange: (node: WorkflowNode) => void;
}) {
  if (node.kind === "trigger") {
    return (
      <>
        <Field label="Trigger event">
          <select
            className={SELECT_CLASS_NAME}
            onChange={(event) =>
              onChange({
                ...node,
                config: defaultTriggerConfig(
                  event.currentTarget.value as WorkflowTriggerConfig["event"],
                ),
              })
            }
            value={node.config.event}
          >
            <option value="manual">Manual run</option>
            <option value="issue-status">Issue status changes</option>
            <option value="issue-queued">Issue queued</option>
            <option value="repository">Repository event</option>
            <option value="schedule">Schedule</option>
            <option value="webhook">Webhook</option>
          </select>
        </Field>
        {node.config.event === "issue-status" ? (
          <Field label="Issue status">
            <select
              className={SELECT_CLASS_NAME}
              onChange={(event) =>
                onChange({
                  ...node,
                  config: {
                    ...node.config,
                    status: event.currentTarget.value as typeof node.config.status,
                  },
                } as WorkflowNode)
              }
              value={node.config.status}
            >
              {[
                "Backlog",
                "Planned",
                "Ready",
                "Queued",
                "Running",
                "Blocked",
                "Review",
                "Done",
              ].map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
        {node.config.event === "repository" ? (
          <Field label="Repository event">
            <select
              className={SELECT_CLASS_NAME}
              onChange={(event) =>
                onChange({
                  ...node,
                  config: {
                    ...node.config,
                    action: event.currentTarget.value as "push" | "pull-request",
                  },
                } as WorkflowNode)
              }
              value={node.config.action}
            >
              <option value="pull-request">Pull request</option>
              <option value="push">Push</option>
            </select>
          </Field>
        ) : null}
        {node.config.event === "schedule" ? (
          <>
            <Field label="Cron expression">
              <Input
                className="font-mono"
                onChange={(event) =>
                  onChange({
                    ...node,
                    config: { ...node.config, cron: event.currentTarget.value },
                  } as WorkflowNode)
                }
                value={node.config.cron}
              />
            </Field>
            <Field label="Timezone">
              <Input
                onChange={(event) =>
                  onChange({
                    ...node,
                    config: { ...node.config, timezone: event.currentTarget.value },
                  } as WorkflowNode)
                }
                value={node.config.timezone}
              />
            </Field>
          </>
        ) : null}
        {node.config.event === "webhook" ? (
          <Field label="Webhook path">
            <Input
              className="font-mono"
              onChange={(event) =>
                onChange({
                  ...node,
                  config: { ...node.config, path: event.currentTarget.value },
                } as WorkflowNode)
              }
              value={node.config.path}
            />
          </Field>
        ) : null}
      </>
    );
  }

  if (node.kind === "agent") {
    return (
      <>
        <Field label="Agent profile">
          <select
            className={SELECT_CLASS_NAME}
            onChange={(event) =>
              onChange({
                ...node,
                config: { ...node.config, agentProfileId: event.currentTarget.value },
              })
            }
            value={node.config.agentProfileId}
          >
            <option value="agent-profile-codex">Codex · implementation</option>
            <option value="agent-profile-planning">Codex · planning</option>
            <option value="agent-profile-review">Codex · review</option>
          </select>
        </Field>
        <Field label="Instructions">
          <Textarea
            className="min-h-40 text-xs leading-relaxed"
            onChange={(event) =>
              onChange({ ...node, config: { ...node.config, prompt: event.currentTarget.value } })
            }
            value={node.config.prompt}
          />
        </Field>
        <Field label="Working directory">
          <Input
            className="font-mono"
            onChange={(event) =>
              onChange({
                ...node,
                config: { ...node.config, workingDirectory: event.currentTarget.value },
              })
            }
            value={node.config.workingDirectory}
          />
        </Field>
        <RetryFields
          onChange={(retry) => onChange({ ...node, config: { ...node.config, retry } })}
          retry={node.config.retry}
        />
      </>
    );
  }

  if (node.kind === "test" || node.kind === "hook") {
    return (
      <>
        {node.kind === "hook" ? (
          <Field label="Hook">
            <select
              className={SELECT_CLASS_NAME}
              onChange={(event) =>
                onChange({
                  ...node,
                  config: {
                    ...node.config,
                    hook: event.currentTarget.value as typeof node.config.hook,
                  },
                } as WorkflowNode)
              }
              value={node.config.hook}
            >
              <option value="pre-commit">Pre-commit</option>
              <option value="pre-push">Pre-push</option>
              <option value="post-run">Post-run</option>
              <option value="custom">Custom</option>
            </select>
          </Field>
        ) : null}
        <Field label="Command">
          <Textarea
            className="min-h-24 font-mono text-xs"
            onChange={(event) =>
              onChange({
                ...node,
                config: { ...node.config, command: event.currentTarget.value },
              } as WorkflowNode)
            }
            value={node.config.command}
          />
        </Field>
        {node.kind === "test" ? (
          <Field label="Working directory">
            <Input
              className="font-mono"
              onChange={(event) =>
                onChange({
                  ...node,
                  config: { ...node.config, workingDirectory: event.currentTarget.value },
                } as WorkflowNode)
              }
              value={node.config.workingDirectory}
            />
          </Field>
        ) : null}
        <RetryFields
          onChange={(retry) =>
            onChange({ ...node, config: { ...node.config, retry } } as WorkflowNode)
          }
          retry={node.config.retry}
        />
      </>
    );
  }

  if (node.kind === "approval") {
    return (
      <>
        <Field label="Approver group">
          <Input
            onChange={(event) =>
              onChange({
                ...node,
                config: { ...node.config, approverGroup: event.currentTarget.value },
              })
            }
            value={node.config.approverGroup}
          />
        </Field>
        <Field label="Instructions">
          <Textarea
            className="min-h-28 text-xs"
            onChange={(event) =>
              onChange({
                ...node,
                config: { ...node.config, instructions: event.currentTarget.value },
              })
            }
            value={node.config.instructions}
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Timeout (min)">
            <Input
              min={1}
              onChange={(event) =>
                onChange({
                  ...node,
                  config: {
                    ...node.config,
                    timeoutMinutes: numberFromInput(
                      event.currentTarget.value,
                      node.config.timeoutMinutes ?? 1440,
                    ),
                  },
                })
              }
              type="number"
              value={node.config.timeoutMinutes ?? ""}
            />
          </Field>
          <Field label="On timeout">
            <select
              className={SELECT_CLASS_NAME}
              onChange={(event) =>
                onChange({
                  ...node,
                  config: {
                    ...node.config,
                    timeoutOutcome: event.currentTarget.value as "reject" | "fail",
                  },
                })
              }
              value={node.config.timeoutOutcome}
            >
              <option value="reject">Reject</option>
              <option value="fail">Fail run</option>
            </select>
          </Field>
        </div>
      </>
    );
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          Conditions
        </Label>
        <Button
          onClick={() => {
            const index = node.config.cases.length + 1;
            onChange({
              ...node,
              config: {
                cases: [
                  ...node.config.cases,
                  {
                    id: `${node.id}-case-${index}`,
                    label: `Condition ${index}`,
                    expression: "result.ok === true",
                  },
                ],
              },
            });
          }}
          size="xs"
          type="button"
          variant="ghost"
        >
          <PlusIcon />
          Add
        </Button>
      </div>
      {node.config.cases.map((workflowCase, index) => (
        <div
          className="space-y-2 rounded-lg border border-border/60 bg-muted/15 p-2.5"
          key={workflowCase.id}
        >
          <div className="flex gap-2">
            <Input
              aria-label={`Condition ${index + 1} label`}
              onChange={(event) => {
                const cases = node.config.cases.map((candidate) =>
                  candidate.id === workflowCase.id
                    ? { ...candidate, label: event.currentTarget.value }
                    : candidate,
                );
                onChange({ ...node, config: { cases } });
              }}
              value={workflowCase.label}
            />
            <Button
              aria-label={`Remove ${workflowCase.label}`}
              disabled={node.config.cases.length === 1}
              onClick={() =>
                onChange({
                  ...node,
                  config: {
                    cases: node.config.cases.filter(({ id }) => id !== workflowCase.id),
                  },
                })
              }
              size="icon-xs"
              type="button"
              variant="ghost"
            >
              <Trash2Icon />
            </Button>
          </div>
          <Input
            aria-label={`${workflowCase.label} expression`}
            className="font-mono"
            onChange={(event) => {
              const cases = node.config.cases.map((candidate) =>
                candidate.id === workflowCase.id
                  ? { ...candidate, expression: event.currentTarget.value }
                  : candidate,
              );
              onChange({ ...node, config: { cases } });
            }}
            value={workflowCase.expression}
          />
        </div>
      ))}
    </section>
  );
}

export function WorkflowInspector({
  diagnostics,
  node,
  onClose,
  onUpdateNode,
  onUpdateWorkflow,
  workflowDescription,
  workflowName,
}: {
  readonly diagnostics: readonly WorkflowDiagnostic[];
  readonly node: WorkflowNode | null;
  readonly onClose: () => void;
  readonly onUpdateNode: (node: WorkflowNode) => void;
  readonly onUpdateWorkflow: (metadata: {
    readonly name: string;
    readonly description: string;
  }) => void;
  readonly workflowDescription: string;
  readonly workflowName: string;
}) {
  const [draftNode, setDraftNode] = useState(node);
  const [name, setName] = useState(workflowName);
  const [description, setDescription] = useState(workflowDescription);

  useEffect(() => setDraftNode(node), [node]);
  useEffect(() => {
    setName(workflowName);
    setDescription(workflowDescription);
  }, [workflowDescription, workflowName]);

  const relevantDiagnostics = node
    ? diagnostics.filter(({ nodeId }) => !nodeId || nodeId === node.id)
    : diagnostics;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (draftNode) onUpdateNode(draftNode);
    else onUpdateWorkflow({ name, description });
  };

  return (
    <aside className="flex h-full min-h-0 w-[320px] shrink-0 flex-col border-l border-border/65 bg-background/96 shadow-[-12px_0_36px_-28px_hsl(var(--foreground)/0.35)] backdrop-blur-xl">
      <div className="flex h-11 items-center justify-between border-b border-border/60 px-3.5">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-foreground">
            {node ? node.name : "Workflow settings"}
          </p>
          <p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
            {node?.kind ?? "Template"}
          </p>
        </div>
        <Button aria-label="Close inspector" onClick={onClose} size="icon-xs" variant="ghost">
          <XIcon />
        </Button>
      </div>

      <form className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3.5">
          {draftNode ? (
            <>
              <Field label="Step name">
                <Input
                  onChange={(event) =>
                    setDraftNode({ ...draftNode, name: event.currentTarget.value } as WorkflowNode)
                  }
                  value={draftNode.name}
                />
              </Field>
              <label className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5 text-xs">
                <span>
                  <span className="block font-medium">Enabled</span>
                  <span className="mt-0.5 block text-[10px] text-muted-foreground">
                    Disabled steps remain visible but do not execute.
                  </span>
                </span>
                <input
                  checked={!draftNode.disabled}
                  className="size-4 accent-primary"
                  onChange={(event) =>
                    setDraftNode({
                      ...draftNode,
                      disabled: !event.currentTarget.checked,
                    } as WorkflowNode)
                  }
                  type="checkbox"
                />
              </label>
              <NodeConfiguration node={draftNode} onChange={setDraftNode} />
            </>
          ) : (
            <>
              <Field label="Template name">
                <Input onChange={(event) => setName(event.currentTarget.value)} value={name} />
              </Field>
              <Field label="Description">
                <Textarea
                  className="min-h-28 text-xs"
                  onChange={(event) => setDescription(event.currentTarget.value)}
                  value={description}
                />
              </Field>
            </>
          )}

          {relevantDiagnostics.length > 0 ? (
            <section className="space-y-2 rounded-lg border border-warning/25 bg-warning/5 p-3">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-warning-foreground">
                <AlertTriangleIcon className="size-3.5" />
                Validation
              </div>
              {relevantDiagnostics.slice(0, 5).map((diagnostic) => (
                <p
                  className="text-[10px] leading-4 text-muted-foreground"
                  key={`${diagnostic.code}-${diagnostic.nodeId ?? "graph"}`}
                >
                  {diagnostic.message}
                </p>
              ))}
            </section>
          ) : null}
        </div>
        <div className="border-t border-border/60 p-3">
          <Button className="w-full" size="sm" type="submit">
            <SaveIcon />
            Save {node ? "step" : "workflow"}
          </Button>
        </div>
      </form>
    </aside>
  );
}

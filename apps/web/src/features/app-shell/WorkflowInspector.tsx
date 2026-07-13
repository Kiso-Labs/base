import {
  AlertTriangleIcon,
  BotIcon,
  BoxesIcon,
  CheckCircle2Icon,
  FlaskConicalIcon,
  GitBranchIcon,
  Layers3Icon,
  PlusIcon,
  SaveIcon,
  ShieldCheckIcon,
  Trash2Icon,
  WebhookIcon,
  XIcon,
  ZapIcon,
} from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";

import type {
  WorkflowDiagnostic,
  WorkflowNode,
  WorkflowRetryPolicy,
  WorkflowTriggerConfig,
} from "./workflowGraph";

const SELECT_CLASS_NAME =
  "h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

const NODE_KIND_META = {
  trigger: { icon: ZapIcon, label: "Trigger", className: "bg-amber-500/10 text-amber-600" },
  agent: { icon: BotIcon, label: "Agent step", className: "bg-violet-500/10 text-violet-600" },
  test: { icon: FlaskConicalIcon, label: "Test", className: "bg-emerald-500/10 text-emerald-600" },
  hook: { icon: WebhookIcon, label: "Hook", className: "bg-cyan-500/10 text-cyan-600" },
  approval: {
    icon: ShieldCheckIcon,
    label: "Approval",
    className: "bg-orange-500/10 text-orange-600",
  },
  branch: { icon: GitBranchIcon, label: "Branch", className: "bg-blue-500/10 text-blue-600" },
} as const;

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

function InspectorSection({
  children,
  description,
  title,
}: {
  readonly children: ReactNode;
  readonly description?: string;
  readonly title: string;
}) {
  return (
    <section className="space-y-3 rounded-xl border border-border/60 bg-card/45 p-3.5 shadow-xs">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-foreground/80">
          {title}
        </p>
        {description ? (
          <p className="mt-1 text-[10px] leading-4 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
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
        <div className="grid grid-cols-2 gap-2">
          <Field label="Timeout (sec)">
            <Input
              min={1}
              onChange={(event) =>
                onChange({
                  ...node,
                  config: {
                    ...node.config,
                    timeoutSeconds: numberFromInput(
                      event.currentTarget.value,
                      node.config.timeoutSeconds,
                    ),
                  },
                })
              }
              type="number"
              value={node.config.timeoutSeconds}
            />
          </Field>
          <Field label="Tools">
            <Input
              onChange={(event) =>
                onChange({
                  ...node,
                  config: {
                    ...node.config,
                    tools: event.currentTarget.value
                      .split(",")
                      .map((tool) => tool.trim())
                      .filter(Boolean),
                  },
                })
              }
              placeholder="repository, terminal"
              value={node.config.tools.join(", ")}
            />
          </Field>
        </div>
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
        <Field label="Timeout (sec)">
          <Input
            min={1}
            onChange={(event) =>
              onChange({
                ...node,
                config: {
                  ...node.config,
                  timeoutSeconds: numberFromInput(
                    event.currentTarget.value,
                    node.config.timeoutSeconds,
                  ),
                },
              } as WorkflowNode)
            }
            type="number"
            value={node.config.timeoutSeconds}
          />
        </Field>
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
  kanbanViews,
  node,
  onClose,
  onUpdateTriggerView,
  onUpdateNode,
  onUpdateWorkflow,
  projectName,
  triggerViewId,
  workflowDescription,
  workflowName,
}: {
  readonly diagnostics: readonly WorkflowDiagnostic[];
  readonly kanbanViews: readonly { readonly id: string; readonly name: string }[];
  readonly node: WorkflowNode | null;
  readonly onClose: () => void;
  readonly onUpdateTriggerView: (viewId: string | null) => void;
  readonly onUpdateNode: (node: WorkflowNode) => void;
  readonly onUpdateWorkflow: (metadata: {
    readonly name: string;
    readonly description: string;
  }) => void;
  readonly projectName: string;
  readonly triggerViewId: string | null;
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
  const nodeMeta = node ? NODE_KIND_META[node.kind] : null;
  const NodeIcon = nodeMeta?.icon ?? BoxesIcon;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (draftNode) onUpdateNode(draftNode);
    else onUpdateWorkflow({ name, description });
  };

  return (
    <aside className="flex h-full min-h-0 w-[360px] shrink-0 flex-col border-l border-border/65 bg-background/97 shadow-[-18px_0_44px_-34px_hsl(var(--foreground)/0.45)] backdrop-blur-xl 2xl:w-[380px]">
      <div className="border-b border-border/60 bg-gradient-to-b from-muted/35 to-transparent px-4 pb-3.5 pt-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-current/10",
                nodeMeta?.className ?? "bg-foreground text-background",
              )}
            >
              <NodeIcon className="size-4" />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="truncate text-[13px] font-semibold text-foreground">
                {node ? node.name : "Workflow settings"}
              </p>
              <div className="mt-1 flex items-center gap-1.5">
                <Badge size="sm" variant="secondary">
                  {nodeMeta?.label ?? "Reusable template"}
                </Badge>
                {node ? (
                  <span className="truncate font-mono text-[8px] text-muted-foreground/70">
                    {node.id}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <Button aria-label="Close inspector" onClick={onClose} size="icon-xs" variant="ghost">
            <XIcon />
          </Button>
        </div>
        <p className="mt-3 text-[10px] leading-4 text-muted-foreground">
          {node
            ? "Configure this step, its execution policy, and how it participates in the reusable workflow."
            : "Edit the workspace template. Project issues can assign it without sharing run history."}
        </p>
      </div>

      <form className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3.5">
          {draftNode ? (
            <>
              <InspectorSection
                description="The title appears on the canvas; disabling preserves configuration without executing the step."
                title="Step identity"
              >
                <Field label="Step name">
                  <Input
                    onChange={(event) =>
                      setDraftNode({
                        ...draftNode,
                        name: event.currentTarget.value,
                      } as WorkflowNode)
                    }
                    value={draftNode.name}
                  />
                </Field>
                <label className="flex items-center justify-between rounded-lg border border-border/60 bg-background/70 px-3 py-2.5 text-xs">
                  <span>
                    <span className="block font-medium">Enabled</span>
                    <span className="mt-0.5 block text-[10px] text-muted-foreground">
                      Disabled steps remain on the canvas.
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
              </InspectorSection>

              {draftNode.kind === "trigger" &&
              (draftNode.config.event === "issue-status" ||
                draftNode.config.event === "issue-queued") ? (
                <InspectorSection
                  description="This binding belongs to the project, so the workflow template remains reusable everywhere."
                  title="Project board trigger"
                >
                  <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
                    <span className="flex items-center gap-2 text-[11px] font-medium">
                      <Layers3Icon className="size-3.5 text-primary" />
                      {projectName}
                    </span>
                    <Badge size="sm" variant="info">
                      Project scope
                    </Badge>
                  </div>
                  <Field label="Kanban board view">
                    <select
                      className={SELECT_CLASS_NAME}
                      onChange={(event) =>
                        onUpdateTriggerView(
                          event.currentTarget.value === "__project__"
                            ? null
                            : event.currentTarget.value,
                        )
                      }
                      value={triggerViewId ?? "__project__"}
                    >
                      <option value="__project__">All project issues</option>
                      {kanbanViews.map((view) => (
                        <option key={view.id} value={view.id}>
                          {view.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <p className="rounded-lg border border-dashed border-border/70 px-2.5 py-2 text-[9px] leading-4 text-muted-foreground">
                    Only issues matching this live board view can fire the trigger. Updating the
                    view changes future matches without copying issues.
                  </p>
                </InspectorSection>
              ) : null}

              <InspectorSection
                description="Every field is versioned with the workflow draft and validated before publication."
                title="Configuration"
              >
                <NodeConfiguration node={draftNode} onChange={setDraftNode} />
              </InspectorSection>
            </>
          ) : (
            <>
              <InspectorSection
                description="Templates are shared across projects; publishing creates an immutable executable version."
                title="Template details"
              >
                <Field label="Template name">
                  <Input onChange={(event) => setName(event.currentTarget.value)} value={name} />
                </Field>
                <Field label="Description">
                  <Textarea
                    className="min-h-32 text-xs leading-relaxed"
                    onChange={(event) => setDescription(event.currentTarget.value)}
                    value={description}
                  />
                </Field>
              </InspectorSection>
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
          {relevantDiagnostics.length === 0 ? (
            <div className="flex items-start gap-2 rounded-xl border border-success/20 bg-success/5 px-3 py-2.5">
              <CheckCircle2Icon className="mt-0.5 size-3.5 shrink-0 text-success" />
              <div>
                <p className="text-[10px] font-medium text-success-foreground">
                  Configuration is valid
                </p>
                <p className="mt-0.5 text-[9px] leading-4 text-muted-foreground">
                  Save the draft to refresh graph-level publication checks.
                </p>
              </div>
            </div>
          ) : null}
        </div>
        <div className="border-t border-border/60 bg-background/96 p-3.5">
          <Button className="w-full" size="sm" type="submit">
            <SaveIcon />
            Save {node ? "step" : "workflow"}
          </Button>
        </div>
      </form>
    </aside>
  );
}

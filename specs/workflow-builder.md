# Workflow builder

## Principles

- **Templates are reusable; runs are immutable.** A workflow template belongs to the workspace and may be assigned in any project. Queueing resolves an immutable published version, and the resulting run remains owned by the source issue's project.
- **The graph is a domain model.** Persisted workflow nodes and edges do not depend on React Flow types. The canvas adapts the domain graph so validation, publishing, history, and execution semantics remain testable without rendering.
- **Editing stays safe and reversible.** Structurally impossible graph edits are rejected immediately. Semantically incomplete drafts remain editable, surface actionable findings, and cannot publish until errors are resolved. Every semantic edit supports bounded undo and redo.
- **The canvas is the primary workspace.** The graph receives the available screen space, while the template library, node picker, toolbar, validation, and inspector remain compact and contextual.

## Template and run ownership

- The workspace owns workflow templates. Each template contains one editable draft and zero or more immutable published versions.
- Publishing appends a version only when validation has no errors. Later draft edits never mutate a published version.
- An issue references a workflow template. A project run records the template ID and exact published version it executes.
- Switching projects changes visible issues and runs but never changes the reusable workflow catalog or template graphs.
- Archived or unpublished templates cannot create production runs; selected-node and full-draft tests remain editor-only test activity.

## Typed graph

- Supported node kinds are trigger, agent, test, hook, approval, and branch.
- Trigger configurations cover manual, issue lifecycle, repository, schedule, and webhook events.
- Agent, test, and hook nodes expose bounded retry policy with fixed or exponential backoff. Retry is node policy rather than an unbounded graph cycle.
- Approval nodes define instructions, an approver group, an optional timeout, and timeout behavior.
- Branch nodes define named conditional cases and a default path.
- Edges are outcome typed: success/failure for executable work, approved/rejected/timed-out for approvals, and case/default for branches.

## Validation and publication

- Node and edge IDs are unique; edges reference existing distinct nodes.
- At least one enabled trigger exists, triggers have no incoming edges, and every enabled non-trigger node is reachable from a trigger.
- The control graph is acyclic. Edge outcomes must be legal for their source node, and a source output may connect to only one target.
- Required configuration is present for every node kind. Retry counts and delays remain within documented bounds.
- Branch case IDs and labels are unique, every case has one outgoing edge, and one default edge exists.
- Validation findings identify the relevant node or edge and distinguish publication-blocking errors from warnings.

## Editing and history

- Users can add typed nodes from a searchable palette, connect compatible handles, move and delete selections, edit node configuration in an inspector, and change draft metadata.
- Node deletion removes incident edges atomically. Undo restores the node and its edges as one edit.
- One semantic action creates one history checkpoint. A drag creates one checkpoint on drag end; intermediate pointer positions do not flood history.
- Undo and redo are bounded per template editing session. A new edit after undo clears redo. Persisted drafts hydrate with empty history.
- Nodes, edges, draft metadata, and viewport persist per template. Selection, transient validation UI, and undo stacks do not persist.

## Canvas experience

- The builder uses an infinite pan-and-zoom canvas with subtle grid, fit/zoom controls, minimap, selection, keyboard deletion, and contextual add affordances.
- Nodes stay compact at rest and show type, title, configuration summary, retry/error badges, and typed handles. Selection and hover reveal secondary actions without shifting layout.
- The left rail switches between workflow templates and a searchable node library. The right inspector edits the selected node or workflow metadata.
- The top command bar exposes save state, validation, publish/test actions, undo/redo, fit, and tidy controls with accurate disabled states and shortcut hints.
- Edge color and labels communicate outcomes without relying on color alone. Invalid connections are rejected at the cursor and explained through validation feedback.
- The layout remains usable on smaller desktop widths by collapsing secondary rails while preserving the canvas and inspector access.

## Testing

- Users can validate the draft, test a selected node, or test the full workflow without creating a project production run.
- Test state is visible on the relevant nodes and in a compact results panel, including running, succeeded, failed, and waiting-for-approval states.
- Production queue actions remain in the issue workspace and always create project-scoped runs from published workflow versions.

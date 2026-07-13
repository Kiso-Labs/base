# Issue workspace

## Principles

- **Projects own work.** An issue and every run created from it belong to one project. A project switch must never leak issues, selections, saved views, queue positions, or run history from another project.
- **Views are queries, not copies.** A saved view is a reusable lens over a project's issue collection. Editing an issue updates every view that matches it; saving a view never duplicates issue data.
- **Templates seed work; issues preserve intent.** Workflow and issue templates are reusable workspace resources. Applying a template copies defaults or assigns a workflow reference, while the issue and resulting project run remain independently auditable.
- **Execution is explicit.** Changing display groups never creates runs. Queue actions materialize the currently visible matching issues, reject ineligible issues with reasons, and create runs only inside the selected project.

## Ownership model

- The workspace owns projects, reusable workflow templates, and reusable issue templates.
- Each issue requires one project and may reference one workflow template.
- Each saved issue view requires one project and contains filters, a layout, and a grouping rule.
- Each run requires one project, one source issue, and one workflow template.
- An issue template is applied only during creation; later template edits do not rewrite existing issues.

## Issue collection and saved views

- A project's issue collection is the complete set of issues whose `projectId` matches that project.
- Issues and Board render the same repository. Creation, edits, assignment, status changes, and queue actions appear in both without synchronization work from the user.
- A saved view stores a name, project, layout (`list` or `board`), group rule, and the full issue-filter set.
- Saved views are dynamic: matching issues are resolved from current repository state whenever a view opens or runs.
- Built-in project views provide at least all issues, active work, ready to run, and unassigned work.
- Users can save the current filters, grouping, and layout as a named project view and reopen it later.
- List layout may group by status, priority, assignee, workflow, module, or cycle. Board layout groups by status so guarded lifecycle movement remains visible and predictable.
- Running a view materializes its currently matching issues, lets the user choose one reusable workflow for the collection or use each issue's default, and applies the normal readiness rules. A collection workflow controls the resulting runs without rewriting issue defaults. Partial success is allowed, and every rejection is reported.

## Issue creation and templates

- Issue creation is contextual to the selected project and displays that project before submission.
- A title is required. New issues default to Backlog unless the current context or selected template provides another allowed initial status.
- The composer supports description, status, priority, workflow template, assignee, labels, module, and cycle.
- A user may start blank or apply a reusable issue template. Applying a template visibly populates its defaults and leaves all fields editable before creation.
- Seeded templates cover a bug report, feature delivery, and maintenance work.
- A successful creation allocates the next identifier for that project, opens the issue inspector, and makes the issue immediately visible in every matching saved view.

## Issue management and execution

- Selecting an issue opens a right-side inspector without leaving the current collection.
- The inspector edits title, description, status, priority, workflow template, assignee, module, cycle, labels, and target branch, and displays dependencies, activity, and the latest project run.
- Status transitions follow the guarded lifecycle defined by the issue repository. Queueing is the only transition from Ready to Queued.
- Queueing requires Ready status and an assigned workflow template. It creates a project-scoped run and a project-local queue position.
- Workflow assignment is locked while an issue is Queued or Running.
- Dequeueing returns the issue to Ready and retains the run record as a failed/dequeued audit entry.

## Commands and shortcuts

- Command-K includes commands to open Issues, open Board, create an issue, focus issue search, open issue filters, queue the current project view, and open saved project views.
- Commands operate on the selected project and never use a stale project captured before invocation.
- Visible shortcut hints match the working keyboard behavior.
- `C` creates an issue outside editable controls, `F` opens filters on issue surfaces, and `Ctrl/Command+B` toggles Issues and Board.
- A two-key `G` then `I` shortcut opens Issues and `G` then `B` opens Board outside editable controls.

## Empty and error behavior

- An empty project, empty saved view, and zero-result filter each explain why no issues appear and offer a relevant creation or filter-reset action.
- Invalid transitions, missing workflow assignments, and partial queue failures remain in the current view and show actionable feedback.

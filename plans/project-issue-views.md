---
status: in-progress
depends: []
specs:
  - specs/issue-workspace.md
issues: []
---

# Plan: Project issue views and commands

## Scope

Complete the Phase 2 project issue workspace with reusable issue templates, project-scoped dynamic saved views, grouping, view-level queue actions, richer Linear-style creation and management UI, Command-K actions, and navigation shortcuts. Server persistence, cross-project aggregate views, workflow-canvas authoring, and a new batch-run entity are outside this plan.

## Implements

- `specs/issue-workspace.md` — implement the project ownership model, shared list/board repository, reusable templates, dynamic saved views, explicit queue semantics, inspector management, Command-K actions, and keyboard navigation.

## Approach

1. Extend the pure issue repository with view/template types, deterministic query/group helpers, and view queue behavior covered by focused tests.
2. Persist project views and active-view state beside the existing issue repository while keeping global templates immutable fixtures.
3. Refine the issue composer, filters, view controls, list grouping, board presentation, inspector, and empty states using existing Base primitives.
4. Add route-safe issue actions and shortcut metadata to the shared command palette, then connect keyboard events through explicit issue-workspace commands.
5. Verify domain behavior, project isolation, responsive UI, keyboard flows, and repository-wide gates.

## Validation

- [ ] Pure repository tests cover dynamic view resolution, project isolation, grouping, template application, and view-level queue eligibility.
- [ ] Issues and Board show one live project collection, saved views, templates, inspector edits, and guarded execution actions.
- [ ] Command-K issue actions and the documented keyboard shortcuts work from the authenticated shell without firing inside editable controls.
- [ ] Browser QA verifies creation from a template, saved-view reuse, list/board synchronization, project switching, and project-scoped run creation.
- [ ] `vp check`, `vp run typecheck`, focused tests, and the full `vp test` suite pass.

## Risks / unknowns

- **Prototype persistence** — local persisted state can outlive fixture shape changes, so the store version and migration/reset behavior must stay explicit.
- **Command ownership** — issue commands live in the global palette but depend on feature state, so dispatch must resolve current state at execution time rather than coupling the palette to page components.
- **View execution semantics** — a dynamic view can change between inspection and queue confirmation; confirmation must display the materialized issue set used by the action.

## Notes

Populated at closeout.

## Follow-ups

Populated at closeout.

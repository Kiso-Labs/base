---
status: in-progress
depends: []
specs:
  - specs/workflow-builder.md
issues: []
---

# Plan: Editable workflow canvas

## Scope

Build Phase 3 as a workspace-global workflow template editor with a typed, library-independent graph; React Flow canvas; validation and publication; persisted drafts, viewports, and project Kanban trigger bindings; a deep node inspector; test states; and bounded undo/redo. Project run execution remains owned by the issue repository.

## Implements

- `specs/workflow-builder.md` — implement template/version ownership, typed graph editing, validation, history, persistence, inspection, and the infinite-canvas experience.

## Approach

1. Define and test the graph, command, validation, versioning, and history domain without React Flow dependencies.
2. Add a versioned workflow workspace store that derives reusable summaries and keeps editor-only state separate from persisted drafts.
3. Adapt domain nodes and edges into controlled React Flow components with typed handles, connection guards, compact semantic nodes, and custom outcome edges.
4. Replace the static workflow preview with a full-height builder containing template/library rail, command bar, validation and test feedback, inspector, minimap, and canvas controls.
5. Overlay workflow summaries into the shared workspace context, bind issue validation to the authoritative template catalog, and preserve project-scoped run behavior.
6. Verify pure domain behavior, persistence/history semantics, keyboard actions, responsive canvas layout, and repository-wide gates.

## Validation

- [ ] Domain tests cover typed connection rules, reachability, cycles, branch completeness, retry bounds, atomic deletion, publication, and bounded undo/redo.
- [ ] Workflow drafts, published versions, canvas viewport, and template metadata survive reload without persisting selection or history.
- [ ] The builder supports typed node creation, connection, movement, deletion, inspector edits, validation, testing, undo/redo, fit, and publish actions.
- [ ] Issue assignment sees the live reusable template catalog while production runs remain scoped to the source project and published version.
- [ ] Responsive visual QA confirms the canvas, node palette, inspector, edge labels, controls, and empty/error states remain polished and usable.
- [ ] `vp check`, `vp run typecheck`, focused tests, and the full `vp test` suite pass.

## Risks / unknowns

- **History volume** — React Flow emits continuous position changes during dragging, so history must commit only the final domain positions.
- **Hydration compatibility** — persisted templates will outlive fixture/schema changes, so the store key and migration boundary must stay explicit.
- **Run versioning** — existing run fixtures only store a template ID; strict production version binding needs a compatible fixture migration rather than rewriting past run meaning.
- **Canvas sizing** — the current page shell scrolls ordinary content, so the builder needs an explicit full-height overflow boundary.

## Notes

Populated at closeout.

## Follow-ups

Populated at closeout.

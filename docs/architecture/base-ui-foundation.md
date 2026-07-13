# Base UI foundation

Base is Kiso Labs' desktop-first operating surface for reliable AI-assisted development. Issues hold intent, workflows define execution, agents perform the work, runs preserve the record, and humans keep explicit control over approvals and risky transitions. The issue tracker, agent workspace, and future workflow canvas therefore share one application shell and one set of domain identifiers.

## Foundation decision

The existing T3 Code repository is the Phase 1 foundation. It already provides the expensive, failure-sensitive parts of the product: provider and session lifetimes, desktop/web parity, Electron isolation, TanStack Router, command handling, persistent project selection, resizable panels, terminal and preview surfaces, theme synchronization, and a coherent UI primitive layer.

Plane and Propel remain read-only design references. Both local repositories are AGPL licensed, and inspected Plane application files carry AGPL SPDX headers. Propel's React 18/19, Tailwind 4, Base UI, Vite+, and pnpm stack is technically close to Base, but its global token reset conflicts with Base's `.dark` theme contract and its published `0.1.0` package contains unresolved `catalog:` dependencies. Importing it would require both legal approval and a deliberate application-wide theme migration.

React Flow is the planned Phase 3 canvas engine. Current `@xyflow/react` documentation declares React 17+ peers, so Base's React 19 runtime is compatible. The package is not needed for the Phase 1 shell; adding it later keeps this change narrow and makes the canvas own its stylesheet, controlled node/edge state, and explicitly sized parent.

## Stack audit

| Concern          | Base                                                 | Plane reference                             | Propel reference                                            | Decision                                                                             |
| ---------------- | ---------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Runtime/tooling  | Node `^24.13.1`, pnpm `11.10.0`, Vite+ `0.2.2`       | Node `>=22.18.0`, pnpm `11.3.0`, Turbo/Vite | Node `>=22.12.0`, pnpm `11.10.0`, Vite+ `0.2.2`             | Keep Base's toolchain.                                                               |
| React/TypeScript | React `19.2.6`, TypeScript `~6.0.3`                  | React `18.3.1`, TypeScript `5.8.3`          | React 18/19 peers, local React `19.2.7`, TypeScript `6.0.3` | Keep Base versions; do not transplant app code.                                      |
| Routing/state    | TanStack file router, Effect atoms, Zustand          | React Router, MobX, SWR                     | Component-local state only                                  | Keep Base's authoritative session state and add feature-local prototype state later. |
| Styling          | Tailwind 4, Base UI, semantic CSS variables, `.dark` | Tailwind 4 and app-wide semantic tokens     | Tailwind 4 global variables and `[data-theme]`              | Extend Base tokens; do not run two token systems.                                    |
| Desktop          | Electron `41.5.0` with persistent renderer services  | Web only                                    | Library only                                                | Preserve Base's desktop identity and bridge.                                         |
| Canvas           | Not installed                                        | No Base canvas engine                       | No canvas engine                                            | Add MIT-licensed `@xyflow/react` in Phase 3.                                         |

Visible branding may change to Base, but Phase 1 must preserve persisted and installed-app identities: `t3code:*` storage keys, `.t3` state directories, custom protocols, bundle/application IDs, updater channels, and `@t3tools/*` package names. Renaming those would invalidate sessions, updates, and deep links.

## Route map

The existing agent routes remain stable while the Base product surfaces gain URL-addressable routes.

| Route                       | Surface             | Current behavior                                                         |
| --------------------------- | ------------------- | ------------------------------------------------------------------------ |
| `/`                         | Agent workspace     | Existing T3 Code no-active-thread state remains intact.                  |
| `/:environmentId/:threadId` | Agent session       | Existing persistent thread, terminal, diff, and preview workspace.       |
| `/draft/:draftId`           | Draft agent session | Existing local draft workspace.                                          |
| `/inbox`                    | Inbox               | Base attention-queue preview.                                            |
| `/issues`                   | Issues              | Project-scoped issue list over the shared issue repository.              |
| `/board`                    | Board               | Status-grouped projection of the same project-scoped issue repository.   |
| `/workflows`                | Workflows           | Reusable workflow-template catalog shared across projects.               |
| `/runs`                     | Runs                | Run history scoped to the selected project.                              |
| `/agents`                   | Agents              | Session overview and bridge into the existing agent workspace.           |
| `/repository`               | Repository          | Repository, branch, worktree, and health preview.                        |
| `/settings/*`               | Settings            | Existing settings routes under Base primary navigation.                  |
| `/pair`                     | Pairing             | Existing authentication/pairing surface outside the authenticated shell. |

New product routes sit under one pathless authenticated layout, so the auth guard is not duplicated across route files.

## Phase 2 ownership model

Projects are the unit of execution history and issue planning. Every issue belongs to exactly one project, and every workflow run records both its project and source issue. Workflow templates live at the workspace level so any project can assign the same template without sharing that project's run history.

```text
Workspace
├── workflow templates
└── projects
    └── project
        ├── issues ── assign ──> workflow template
        └── runs   ── execute ─> issue + workflow template
```

The Issues list and Board are projections over one persisted client-side repository. Creation, live filters, inspector edits, workflow assignment, status transitions, and queue actions therefore update both views immediately. Status changes follow an explicit lifecycle; queueing is a dedicated action that requires a Ready issue and an assigned workflow template, then creates a run inside the issue's project.

## Component map

| Base responsibility          | Existing seam reused                                  | Phase 1 addition                                                                                |
| ---------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Authenticated renderer shell | `routes/__root.tsx`                                   | Keep `CommandPalette -> AppSidebarLayout -> Outlet`; add the Base workspace provider.           |
| Primary navigation           | `components/Sidebar.tsx`, `components/ui/sidebar.tsx` | Insert Base project context and primary destinations without replacing project/thread behavior. |
| Project context              | Existing Effect-backed project/session entities       | Add a typed mock workspace repository for product fixtures and selected demo project.           |
| Search and commands          | `components/CommandPalette.tsx`                       | Derive navigation actions and the sidebar search trigger from shared route metadata.            |
| Page chrome                  | `SidebarInset`, workspace titlebar variables          | Add a shared Base page shell with repository, branch, queue, notification, and action slots.    |
| Theme                        | `index.css`, existing theme hooks                     | Add Base chrome, canvas, status, radius, and motion tokens without importing Propel CSS.        |
| Agent workspace              | `_chat` routes and session components                 | Preserve unchanged and link to it from the Agents overview.                                     |
| Future workflow canvas       | New isolated feature package/module                   | Use controlled React Flow state that references domain IDs rather than duplicated entities.     |

## Delivery map

1. **Phase 1 — shell.** Add visible Base/Kiso branding, unified navigation, project context, authenticated product routes, command actions, theme tokens, responsive/resizable page chrome, and representative placeholders while preserving the existing agent workspace.
2. **Phase 2 — issues and board.** Completed as a shared persisted issue repository with project ownership, list/board projections, detail inspector, live filters, creation, guarded drag transitions, reusable workflow-template assignment, and project-scoped queue/run actions.
3. **Phase 3 — workflows.** Add `@xyflow/react`, an isolated canvas store, node library, typed custom nodes/edges, validation, persistence, undo/redo, and inspectors.
4. **Phase 4 — runs.** Add a typed simulated runtime that advances queue items, pauses for approval, follows failure/retry paths, and keeps issue, graph, timeline, console, and agent IDs synchronized.
5. **Phase 5 — polish.** Complete loading/error/empty states, shortcuts, focus restoration, reduced motion, window-size QA, and screenshot coverage.

Phase 1 is expected to add the Base app-shell feature modules and authenticated routes, then make narrow changes to branding, the existing sidebar, command-palette wiring, root providers, and theme tokens. It intentionally does not alter server protocols, provider logic, session persistence, desktop identity, or orchestration infrastructure.

## Expected Phase 1 file set

- `apps/web/src/features/app-shell/**` — Base-owned workspace boundary, navigation, shared page chrome, representative pages, fixtures, and focused tests.
- `apps/web/src/routes/_base*.tsx`, `apps/web/src/routes/__root.tsx`, and `apps/web/src/routeTree.gen.ts` — authenticated product routes and root composition.
- `apps/web/src/components/{Sidebar,CommandPalette,SplashScreen}.tsx` and `apps/web/src/commandPaletteContext.tsx` — unified navigation, command actions, visible shell branding, and search triggers.
- `apps/web/src/index.css`, `apps/web/index.html`, and `apps/web/src/branding.ts` — semantic shell tokens and visible Base identity.
- `apps/desktop/{package.json,scripts/electron-launcher.mjs}`, `apps/desktop/src/app/{DesktopEnvironment,DesktopAppIdentity.test}.ts`, and `scripts/build-desktop-artifact{.test,}.ts` — visible desktop naming with installed-app identities preserved.
- `THIRD_PARTY.md` and `docs/architecture/base-ui-foundation.md` — source/license audit, route/component maps, and phased delivery plan.

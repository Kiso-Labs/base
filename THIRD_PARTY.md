# Base third-party UI review

This report records the UI references considered for Base before external source is copied or a new runtime dependency is introduced. It is an engineering inventory, not a legal conclusion. Any AGPL use or alternate licensing decision still requires legal review.

| Project                                        | Base relationship                                       | Version reviewed                                 | License       | Source use in Base                                                                                                                                                                                                                                           |
| ---------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [T3 Code](https://github.com/pingdotgg/t3code) | Existing application foundation                         | Current repository checkout                      | MIT           | Base continues to modify this repository's existing shell, provider, session, desktop, and web code. The existing MIT notice remains in `LICENSE`.                                                                                                           |
| [Plane](https://github.com/makeplane/plane)    | Information-architecture and interaction reference only | Local `1.3.1` checkout                           | AGPL-3.0      | No Plane source is copied, modified, imported, or bundled. Base independently implements the observed interaction concepts.                                                                                                                                  |
| [Propel](https://github.com/makeplane/propel)  | Visual and component-API reference only                 | Local package `0.1.0`                            | AGPL-3.0-only | No Propel source, styles, assets, or package dependency enters Base. Its current registry package also contains unresolved `catalog:` dependencies, so it is not a usable published dependency.                                                              |
| [Linear](https://linear.app/docs)              | Issue workflow and interaction reference only           | Public product documentation reviewed July 2026  | Proprietary   | Base independently implements documented interaction concepts such as shared list/board views, contextual issue creation, live filters, peek-style detail, and property adoption during drag. No Linear source, styles, assets, or product copy enters Base. |
| [React Flow](https://github.com/xyflow/xyflow) | Planned workflow-canvas dependency in Phase 3           | `@xyflow/react` `12.11.1` documentation reviewed | MIT           | Not installed during Phase 1. When added, retain the upstream license/notice and record the exact locked version here.                                                                                                                                       |

## Phase 1 source boundary

- No files are copied from Plane, Propel, or React Flow.
- Base-owned components use the repository's existing React, Base UI, Tailwind, and Lucide primitives.
- Plane informs issue, board, inspector, and navigation behavior; Propel informs density and token vocabulary. Their code and styles remain outside the Base build.
- Linear's public documentation informs Phase 2 interaction conventions. Base's required project ownership and guarded execution lifecycle are independent domain decisions.
- React Flow is deferred until the workflow-canvas package is introduced. Its required stylesheet will be imported by that feature, and the canvas will live in an explicitly sized flex container.

## Phase 1 modified-source inventory

- **Copied source:** none. No Plane, Propel, or React Flow files, styles, assets, or generated output were copied into Base.
- **New Base-owned source:** `apps/web/src/features/app-shell/**` and `apps/web/src/routes/_base*.tsx` contain the independent shell, fixtures, pages, route metadata, and tests.
- **Modified T3 Code web seams:** `apps/web/src/components/{Sidebar,CommandPalette,SplashScreen}.tsx`, `apps/web/src/commandPaletteContext.tsx`, `apps/web/src/routes/__root.tsx`, `apps/web/src/routeTree.gen.ts`, `apps/web/src/{branding,index}.ts*`, `apps/web/index.html`, and `apps/web/src/index.css` connect Base to the existing renderer.
- **Modified T3 Code desktop/build seams:** `apps/desktop/package.json`, `apps/desktop/scripts/electron-launcher.mjs`, `apps/desktop/src/app/{DesktopEnvironment,DesktopAppIdentity.test}.ts`, and `scripts/build-desktop-artifact{.test,}.ts` change visible product naming while retaining legacy protocol, storage, application, and updater identities.
- **Audit documentation:** `docs/architecture/base-ui-foundation.md` and this file record the foundation and license decisions.

No new AGPL code enters the Base codebase in Phase 1. Adding Plane or Propel code, generated output, bundled assets, or runtime packages changes this boundary and requires an updated report plus legal review.

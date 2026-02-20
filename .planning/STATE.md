# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core value:** Documentation pages must be navigable, correctly titled, and work when opened in new tabs or visited directly — on any static file hosting.
**Current focus:** Phase 3 — Sidebar and Page Rendering (in progress)

## Current Position

Phase: 3 of 3 (Sidebar and Page Rendering)
Plan: 2 of 2 in current phase (complete)
Status: Phase 3 plan 02 complete — conditional H1 suppression and per-page browser titles done

Last activity: 2026-02-20 — Plan 03-02 complete (conditional H1 in MarkdownPage, reactive document.title in DocsPage)

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 6
- Average duration: 2 min
- Total execution time: 12 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-data-layer | 2/2 | 4 min | 2 min |
| 02-flat-html-output | 2/2 | 4 min | 2 min |
| 03-sidebar-and-page-rendering | 2/2 | 4 min | 2 min |

**Recent Trend:**
- Last 5 plans: 2 min, 2 min, 2 min, 2 min, 2 min
- Trend: stable

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Project: Flat HTML files over hash navigation — works on all static hosting without config
- Project: Folder-based hierarchy over frontmatter-based — directory structure is the truth
- Project: 3-level max nesting — balances flexibility with sidebar usability
- Project: Title from first H1, not filename — content is authoritative
- 01-01: Use regex /^#\s+(.+)/m for H1 extraction at scan time — zero-dependency, standard approach (Docusaurus/VitePress pattern)
- 01-01: Preserve raw markdown in H1 captures (backticks, bold) — stripping is a Phase 3 rendering concern
- 01-01: Call assertNoSlugCollisions before sort in scanDocsFolder — fail fast before prerender
- 01-01: Export extractFirstH1 and assertNoSlugCollisions for direct unit testability
- 01-02: Slug path structure (not category frontmatter) determines section/group membership
- 01-02: 4+ segment slugs: parts[0]=section, parts[1]=group, full slug used for anchor
- 01-02: Export toTitleCase and buildNavigationManifest from build.ts for unit testability
- 01-02: TypeScript Map nullish coalescing requires explicit generics (new Map<K,V>())
- 02-01: Doc anchor URLs get .html suffix — matches flat prerender output for direct URL access on GCS/S3
- 02-01: prerenderRoutes entries stay extensionless — Nitro applies .html naming itself via autoSubfolderIndex: false
- 02-01: crawlLinks: true retained — still handles non-doc links discovered during prerender crawl
- 02-02: Strip .html at derivation time (not at link generation) — avoids double-extension bugs
- 02-02: endsWith guard makes SSR prerender (no extension) and direct browser access (with extension) work from same code path
- 03-01: Use props.item.id as localStorage key — globally unique by construction, prevents group-name collisions across sections
- 03-01: typeof window guard in signal initializer prevents SSR prerender crashes — matches existing Sidebar.tsx pattern
- 03-01: createEffect auto-expand is loop-safe: setCollapsed(false) makes collapsed() false, so effect guard is false on next run
- 03-01: flattenNavItems at module scope outside component — static manifest data needs no component closure
- 03-02: Reuse /^#\s+/m regex from Phase 1 loader.ts for H1 detection in MarkdownPage — consistent scan-time and render-time detection
- 03-02: Wrap h1 in SolidJS <Show when={!hasH1()}> — idiomatic conditional rendering, reactive to content changes
- 03-02: document.title uses em dash separator matching browser/OS convention for "Page Title — Site Title" format
- 03-02: typeof document guard in createEffect provides SSR defense-in-depth

### Pending Todos

None yet.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-20
Stopped at: Completed 03-02-PLAN.md (conditional H1 suppression in MarkdownPage, reactive document.title in DocsPage)
Resume file: None

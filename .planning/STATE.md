# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core value:** Documentation pages must be navigable, correctly titled, and work when opened in new tabs or visited directly — on any static file hosting.
**Current focus:** Phase 2 — Flat HTML Output (complete)

## Current Position

Phase: 2 of 3 (Flat HTML Output)
Plan: 2 of 2 in current phase (complete)
Status: Phase 2 complete — ready for Phase 3

Last activity: 2026-02-20 — Plan 02-02 complete (client-side .html stripping in Sidebar, doc route, and WelcomePage)

Progress: [████░░░░░░] 40%

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: 2 min
- Total execution time: 8 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-data-layer | 2/2 | 4 min | 2 min |
| 02-flat-html-output | 2/2 | 4 min | 2 min |

**Recent Trend:**
- Last 5 plans: 2 min, 2 min, 2 min, 2 min
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

### Pending Todos

None yet.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-20
Stopped at: Completed 02-02-PLAN.md (client-side .html handling: Sidebar active state, doc route slug, WelcomePage Guides href)
Resume file: None

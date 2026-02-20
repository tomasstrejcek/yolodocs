# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core value:** Documentation pages must be navigable, correctly titled, and work when opened in new tabs or visited directly — on any static file hosting.
**Current focus:** Phase 2 — Flat HTML Output (in progress)

## Current Position

Phase: 2 of 3 (Flat HTML Output)
Plan: 1 of 2 in current phase (in progress)
Status: Phase 2 Plan 1 complete — ready for Plan 02-02

Last activity: 2026-02-20 — Plan 02-01 complete (Nitro autoSubfolderIndex: false + .html anchor URLs in buildNavigationManifest)

Progress: [███░░░░░░░] 30%

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: 2 min
- Total execution time: 6 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-data-layer | 2/2 | 4 min | 2 min |
| 02-flat-html-output | 1/2 | 2 min | 2 min |

**Recent Trend:**
- Last 5 plans: 2 min, 2 min, 2 min
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

### Pending Todos

None yet.

### Blockers/Concerns

None (autoSubfolderIndex: false + baseURL interaction concern from P7 did not materialise — plan executed cleanly).

## Session Continuity

Last session: 2026-02-20
Stopped at: Completed 02-01-PLAN.md (flat HTML output: autoSubfolderIndex: false in app.config.ts, .html anchors in buildNavigationManifest)
Resume file: None

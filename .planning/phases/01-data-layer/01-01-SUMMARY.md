---
phase: 01-data-layer
plan: 01
subsystem: api
tags: [markdown, loader, slug, tdd, gray-matter, vitest]

# Dependency graph
requires: []
provides:
  - "extractFirstH1(body): string | null — regex-based H1 extractor from markdown"
  - "assertNoSlugCollisions(pages): void — build-time slug prefix collision detector"
  - "scanDocsFolder enhanced with 3-way title priority: frontmatter > H1 > filename"
  - "scanDocsFolder slug normalization: collapse double slashes, strip leading/trailing"
affects:
  - 01-data-layer (plan 02 — manifest builder consumes corrected titles)
  - future phases that rely on DocsPage.title being content-derived

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD: write failing tests first, implement to pass, verify clean"
    - "H1 extraction at scan time via regex /^#\\s+(.+)/m (multiline flag required)"
    - "Build-time assertions for structural invariants (slug collision detection)"
    - "Export utility functions for unit testability (extractFirstH1, assertNoSlugCollisions)"

key-files:
  created:
    - src/markdown/loader.test.ts
  modified:
    - src/markdown/loader.ts
    - dist/ (compiled output)

key-decisions:
  - "Use regex /^#\\s+(.+)/m for H1 extraction at scan time — zero-dependency, standard approach (Docusaurus/VitePress pattern)"
  - "Preserve raw markdown in H1 captures (backticks, bold) — stripping is a Phase 3 rendering concern"
  - "Call assertNoSlugCollisions before sort in scanDocsFolder — fail fast before prerender"
  - "Export extractFirstH1 and assertNoSlugCollisions for direct unit testability"

patterns-established:
  - "Title priority chain: frontmatter.title > first H1 > filename (basename without extension)"
  - "Slug normalization pipeline: strip extension, normalize backslash, collapse double slashes, strip leading/trailing slashes"
  - "Slug collision = one slug is a strict path prefix of another (e.g., 'api' vs 'api/intro')"

requirements-completed: [DATA-02, DATA-04, TITL-01, TITL-02]

# Metrics
duration: 2min
completed: 2026-02-20
---

# Phase 1 Plan 01: Loader Enhancements Summary

**H1 extraction from markdown via `/^#\s+(.+)/m` regex, 3-way title priority chain (frontmatter > H1 > filename), slug normalization, and build-time prefix collision detection added to `scanDocsFolder`**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-20T13:28:56Z
- **Completed:** 2026-02-20T13:30:22Z
- **Tasks:** 1 feature (TDD: RED → GREEN)
- **Files modified:** 2 source files + dist/

## Accomplishments

- `extractFirstH1(body)` exported from loader.ts — uses multiline regex so H1 anywhere in the file is found, raw inline markdown preserved
- Title priority chain implemented: frontmatter.title wins, then first H1, then filename as last resort
- Slug normalization added: double slashes collapsed, leading/trailing slashes stripped (Windows backslash already handled)
- `assertNoSlugCollisions(pages)` exported and called in `scanDocsFolder` before sort — throws descriptive error naming both conflicting slugs when a slug is a path prefix of another
- 26 new unit + integration tests covering all behaviors including edge cases (empty H1, inline code/bold in H1, empty pages, nonexistent dir)

## Task Commits

Each TDD phase was committed atomically:

1. **RED - Failing tests** - `93ec447` (test)
2. **GREEN - Implementation** - `2684d5d` (feat)

**Plan metadata:** committed with SUMMARY/STATE/ROADMAP update (docs)

_TDD tasks have two commits: test (RED) then feat (GREEN)_

## Files Created/Modified

- `src/markdown/loader.ts` - Added `extractFirstH1`, `assertNoSlugCollisions`, enhanced `scanDir` with H1 extraction and slug normalization, `scanDocsFolder` calls collision check before sort
- `src/markdown/loader.test.ts` - 26 tests: extractFirstH1 (8 cases), title priority via scanDocsFolder (4 cases), slug normalization (2 cases), assertNoSlugCollisions (6 cases), collision integration (2 cases), full scanDocsFolder integration (4 cases)
- `dist/` - Compiled TypeScript output (committed per CLAUDE.md rules)

## Decisions Made

- Used regex `/^#\s+(.+)/m` (with multiline flag) for H1 extraction — same pattern used by Docusaurus, VitePress, Starlight; zero extra dependencies; captures raw markdown
- Preserved inline markdown in H1 captures (backticks, bold stay as-is) — stripping is a Phase 3 sidebar rendering concern, not a data layer concern
- Called `assertNoSlugCollisions` before the sort step in `scanDocsFolder` — earliest possible detection point, before any downstream processing
- Exported `extractFirstH1` and `assertNoSlugCollisions` as named exports for direct unit testability without needing temp directories

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — implementation was straightforward. Multiline `/m` flag in the H1 regex is the only subtlety; the plan called this out explicitly and it worked as expected.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `scanDocsFolder` now produces `DocsPage[]` with correct content-derived titles and validated (collision-free) slugs
- Plan 02 (manifest builder / `buildNavigationManifest` refactor) can consume these corrected `DocsPage` entries directly
- No blockers — all DATA-02, DATA-04, TITL-01, TITL-02 requirements are satisfied and verified by tests

---
*Phase: 01-data-layer*
*Completed: 2026-02-20*

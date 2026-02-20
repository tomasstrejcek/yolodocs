---
phase: 01-data-layer
plan: 02
subsystem: api
tags: [navigation, manifest, sidebar, grouping, tdd, typescript]

# Dependency graph
requires:
  - phase: 01-data-layer
    plan: 01
    provides: "H1-derived titles and normalized slugs on DocsPage from loader"
provides:
  - "3-level navigation manifest: multi-section (docs + per-folder) with group items for subfolders"
  - "Exported toTitleCase() for hyphen-separated slug -> Title Case conversion"
  - "Exported buildNavigationManifest() for direct unit testability"
affects:
  - phase-03-sidebar-rendering
  - NavigationSection / NavigationItem consumers

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "sectionMap: Map<string, {ungrouped, groups}> pattern for 3-level grouping"
    - "Slug segment count determines hierarchy depth (1=root, 2=section, 3+=section+group)"
    - "Export functions needed for unit testing from same module"

key-files:
  created: []
  modified:
    - src/cli/build.ts
    - src/cli/build.test.ts

key-decisions:
  - "Slug path structure (not category frontmatter) determines section/group membership"
  - "4+ segment slugs: parts[0]=section, parts[1]=group, rest flattened into leaf anchor"
  - "Root pages emitted into 'docs' section only when present (no empty sections)"
  - "toTitleCase and buildNavigationManifest exported for unit testability without separate module"

patterns-established:
  - "TDD RED commit before GREEN: import the not-yet-exported functions to get failing imports"
  - "TypeScript Map nullish coalescing needs explicit generic annotation: new Map<K,V>()"

requirements-completed: [DATA-01, DATA-03, NAV-03, NAV-06]

# Metrics
duration: 2min
completed: 2026-02-20
---

# Phase 1 Plan 02: 3-level multi-section navigation manifest Summary

**Refactored buildNavigationManifest to produce separate NavigationSections per top-level docs folder with collapsible group items for second-level subfolders and title-cased labels**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-20T12:32:45Z
- **Completed:** 2026-02-20T12:34:55Z
- **Tasks:** 3 (RED test, GREEN impl, build+dist)
- **Files modified:** 2 source + 4 dist files

## Accomplishments
- Extracted `toTitleCase(s)` helper (hyphen -> space -> capitalise each word) and exported it for testing
- Replaced flat single-section docs grouping with `sectionMap` approach producing one NavigationSection per top-level folder (`docs-{folder}`) plus a `docs` root section for unfiled pages
- Second-level subfolder pages become group NavigationItems (`docs-folder-{section}-{group}`) with children sorted by order/title
- Sort order: root section first, folder sections alphabetically, ungrouped pages before groups, pages by order then title within group
- 19 new unit tests covering all grouping rules, title-casing, sort order, base prefix, schema section position, and the full 5-page example

## Task Commits

Each task was committed atomically:

1. **Task 1: RED — failing tests for 3-level grouping** - `9177713` (test)
2. **Task 2: GREEN + build — implement multi-section manifest** - `c2d3012` (feat)

_Note: TDD tasks committed RED then GREEN. TypeScript type annotation fix (Map generic) was part of the GREEN commit._

## Files Created/Modified
- `src/cli/build.ts` - Added toTitleCase export, exported buildNavigationManifest, replaced docs section logic with 3-level sectionMap approach
- `src/cli/build.test.ts` - Added 19 new tests in `describe("buildNavigationManifest")` and `describe("toTitleCase")` blocks
- `dist/src/cli/build.js` - Compiled output (published artifact)
- `dist/src/cli/build.d.ts` - Type declarations for exported functions

## Decisions Made
- Slug path structure (not `category` frontmatter) determines section/group membership — folder layout is authoritative, as specified in plan
- 4+ segment slugs: `parts[0]` = section, `parts[1]` = group, full slug still used for anchor (no truncation)
- Exported `toTitleCase` and `buildNavigationManifest` directly from `build.ts` rather than splitting to a separate module — simpler, avoids circular imports
- TypeScript required explicit `Map<string, PageEntry[]>()` generic annotation when using nullish coalescing with a new Map literal (inferred as `Map<never, never>` otherwise)

## Deviations from Plan

None - plan executed exactly as written.

The TypeScript Map generic annotation issue was a minor implementation detail (Rule 1 auto-fix), caught immediately by `npm run build` and resolved inline before the GREEN commit.

## Issues Encountered
- TypeScript error `TS2345: Argument of type '...' is not assignable to parameter of type 'never'` on Map nullish coalescing — fixed by adding explicit generics `new Map<string, PageEntry[]>()`. Standard TypeScript inference limitation.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- NavigationManifest now emits multi-section structure; Phase 3 sidebar rendering can consume `sections` array with section/group/item nesting
- `toTitleCase` exported and tested; Phase 3 may reuse it for any label transformations
- All existing 39 tests still pass; 19 new tests added (58 total)
- `dist/` updated and ready for `npx github:tomasstrejcek/yolodocs` usage

## Self-Check: PASSED

- FOUND: src/cli/build.ts
- FOUND: src/cli/build.test.ts
- FOUND: .planning/phases/01-data-layer/01-02-SUMMARY.md
- FOUND: 9177713 (RED test commit)
- FOUND: c2d3012 (GREEN feat commit)
- Tests: 58/58 passing
- Build: TypeScript compiles without errors

---
*Phase: 01-data-layer*
*Completed: 2026-02-20*

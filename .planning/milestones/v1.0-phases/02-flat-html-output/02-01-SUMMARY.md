---
phase: 02-flat-html-output
plan: 01
subsystem: infra
tags: [nitro, solidstart, prerender, navigation, static-hosting]

# Dependency graph
requires:
  - phase: 01-data-layer
    provides: buildNavigationManifest function with doc anchor generation
provides:
  - Flat .html file output from Nitro prerender (autoSubfolderIndex: false)
  - Doc anchor URLs with .html extension in navigation manifest
  - All 58 tests passing with updated anchor assertions
affects: [03-router-links, site-navigation, static-hosting-deployment]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Doc anchors include .html suffix for flat file hosting compatibility"
    - "Nitro autoSubfolderIndex: false produces slug.html instead of slug/index.html"

key-files:
  created: []
  modified:
    - src/cli/build.ts
    - src/cli/build.test.ts
    - src/site/app.config.ts

key-decisions:
  - "Doc anchor URLs get .html suffix — matches flat prerender output for direct URL access on GCS/S3"
  - "prerenderRoutes entries stay extensionless — Nitro applies .html naming itself via autoSubfolderIndex: false"
  - "crawlLinks: true retained — still handles non-doc links discovered during prerender crawl"

patterns-established:
  - "TDD flow: RED commit (test assertions updated) before GREEN commit (implementation)"
  - "Schema hash-based anchors (#query-, #mutation-, etc.) remain unchanged — only doc path anchors get .html"

requirements-completed: [HOST-01, HOST-02, HOST-03]

# Metrics
duration: 2min
completed: 2026-02-20
---

# Phase 02 Plan 01: Flat HTML Output Summary

**Nitro prerender configured with `autoSubfolderIndex: false` and doc anchor URLs updated to `.html` extension, enabling direct slug.html file access on GCS/S3 without URL rewriting**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-20T13:09:49Z
- **Completed:** 2026-02-20T13:11:08Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added `autoSubfolderIndex: false` to Nitro prerender config — Nitro now emits `slug.html` flat files instead of `slug/index.html` directories
- Updated all three doc anchor generation sites in `buildNavigationManifest` to append `.html` — root pages, section ungrouped pages, and group child pages
- Updated 5 test assertions to expect `.html` anchors; all 58 tests pass
- Schema hash-based anchors (`#query-`, `#mutation-`, etc.) remain unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: RED - Update anchor assertions to expect .html extension** - `135a5f3` (test)
2. **Task 2: GREEN - Add .html to doc anchors + enable flat prerender** - `b97da51` (feat)

**Plan metadata:** (docs commit follows)

_Note: TDD tasks — test commit (RED) before implementation commit (GREEN)_

## Files Created/Modified

- `src/cli/build.ts` - Appended `.html` to doc anchor template literals in 3 locations inside `buildNavigationManifest`
- `src/cli/build.test.ts` - Updated 5 anchor assertions to expect `.html` suffix
- `src/site/app.config.ts` - Added `autoSubfolderIndex: false` to Nitro prerender config

## Decisions Made

- Doc anchor URLs get `.html` suffix — matches flat prerender output so sidebar links resolve correctly on any static host without URL rewriting configured
- `prerenderRoutes` entries stay extensionless (`/docs/getting-started`) — Nitro applies the `.html` naming itself when `autoSubfolderIndex: false`
- `crawlLinks: true` retained — continues to handle any non-doc internal links discovered during prerender crawl

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

- Flat HTML output configuration is complete
- Navigation manifest anchors now match actual output file paths (`slug.html`)
- Ready for Phase 2 Plan 02: router-level link handling so SolidStart `<A>` components and client-side navigation also use `.html` URLs

## Self-Check: PASSED

- FOUND: src/site/app.config.ts
- FOUND: src/cli/build.ts
- FOUND: src/cli/build.test.ts
- FOUND: .planning/phases/02-flat-html-output/02-01-SUMMARY.md
- FOUND commit 135a5f3 (test RED)
- FOUND commit b97da51 (feat GREEN)

---
*Phase: 02-flat-html-output*
*Completed: 2026-02-20*

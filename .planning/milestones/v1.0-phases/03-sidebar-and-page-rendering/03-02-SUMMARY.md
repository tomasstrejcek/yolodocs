---
phase: 03-sidebar-and-page-rendering
plan: 02
subsystem: ui
tags: [solid-js, markdown, show, createEffect, document-title, h1-detection]

# Dependency graph
requires:
  - phase: 01-data-layer
    provides: H1 extraction regex pattern (same /^#\s+/m used in loader.ts)
provides:
  - Conditional H1 rendering: MarkdownPage suppresses component heading when markdown already has H1
  - Per-page browser tab title: DocsPage sets document.title reactively using page + site title
affects: [03-sidebar-and-page-rendering, page-rendering, doc-pages]

# Tech tracking
tech-stack:
  added: []
  patterns: [SolidJS Show component for conditional rendering, createEffect for side effects on navigation, typeof document guard for SSR safety]

key-files:
  created: []
  modified:
    - src/site/src/components/markdown/MarkdownPage.tsx
    - src/site/src/routes/docs/[...path].tsx

key-decisions:
  - "Use /^#\\s+/m regex in hasH1 memo to match same pattern as loader.ts extractFirstH1 — consistent detection across scan-time and render-time"
  - "Wrap h1 element in <Show when={!hasH1()}> — SolidJS idiomatic conditional rendering, reactive to content changes"
  - "document.title uses em dash separator (\\u2014) matching common browser convention (e.g. 'Getting Started — Carl API')"
  - "typeof document !== 'undefined' guard in createEffect provides SSR defense-in-depth even though effects don't run during SSR"

patterns-established:
  - "SolidJS Show pattern: import Show from solid-js, use <Show when={condition}> to conditionally render heading elements"
  - "Reactive document.title: use createEffect with page() reactive signal so title updates on SPA navigation without page reload"
  - "Site config import pattern: import siteConfig from '../../data/site-config.json' for accessing CLI-configured title in components"

requirements-completed: [TITL-03, TITL-04]

# Metrics
duration: 2min
completed: 2026-02-20
---

# Phase 3 Plan 02: Conditional H1 Suppression and Per-Page Browser Titles Summary

**Conditional H1 suppression via /^#\\s+/m regex memo in MarkdownPage, plus reactive document.title in DocsPage using page title and siteConfig**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-20T14:42:41Z
- **Completed:** 2026-02-20T14:44:49Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments
- MarkdownPage now detects H1 in markdown content via regex memo and suppresses the component-rendered heading to prevent duplicates
- DocsPage sets document.title reactively using page().title and siteConfig.title with em dash separator
- Browser tab title updates on SPA navigation between doc pages (createEffect is reactive to page() signal changes)
- Integration build confirmed: generated HTML has only one H1 per doc page, document.title assignment present in JS bundles

## Task Commits

Each task was committed atomically:

1. **Task 1: Add conditional H1 rendering to MarkdownPage** - `df14c1e` (feat)
2. **Task 2: Add per-page browser tab title to DocsPage** - `041fe9b` (feat)
3. **Task 3: Build and integration test** - no new commit (build verification, no source changes)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/site/src/components/markdown/MarkdownPage.tsx` - Added Show import, hasH1 memo with `/^#\s+/m` regex, wrapped h1 in `<Show when={!hasH1()}>`
- `src/site/src/routes/docs/[...path].tsx` - Added createEffect import, siteConfig import, createEffect setting document.title to "Page Title — Site Title"

## Decisions Made
- Reused `/^#\s+/m` regex from Phase 1 loader.ts extractFirstH1 for consistency between scan-time and render-time H1 detection
- SolidJS `<Show>` component preferred over ternary for idiomatic conditional rendering
- `typeof document !== "undefined"` guard in createEffect for SSR safety even though effects don't run during SSR
- Em dash (`\u2014`) separator in document.title matches browser/OS convention

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Integration test first failed when run with relative paths (CWD mismatch); resolved by using absolute paths in the command. Pre-existing issue with `node` CWD vs project root. No code changes needed.

## Next Phase Readiness
- H1 suppression and browser tab titles complete (TITL-03, TITL-04 done)
- Doc pages now render without duplicate headings and show correct tab titles
- Phase 3 plan 02 complete

---
*Phase: 03-sidebar-and-page-rendering*
*Completed: 2026-02-20*

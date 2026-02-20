---
phase: 02-flat-html-output
plan: "02"
subsystem: site-template
tags: [flat-html, client-routing, active-state, solid-js]
requirements: [HOST-04]

dependency_graph:
  requires: [02-01]
  provides: [browser-url-html-handling]
  affects: [sidebar-active-state, doc-page-lookup, welcome-page-navigation]

tech_stack:
  added: []
  patterns:
    - "endsWith(\".html\") guard for defensive URL normalization"
    - "Ternary strip: rawSlug.endsWith('.html') ? rawSlug.slice(0, -5) : rawSlug"

key_files:
  created: []
  modified:
    - src/site/src/components/layout/Sidebar.tsx
    - "src/site/src/routes/docs/[...path].tsx"
    - src/site/src/components/welcome/WelcomePage.tsx

decisions:
  - "Strip .html at derivation time (not at link generation time) — avoids double-extension bugs"
  - "endsWith guard makes both SSR prerender (no extension) and direct browser access (with extension) work from same code path"

metrics:
  duration: "2 min"
  completed: "2026-02-20"
  tasks_completed: 2
  files_modified: 3
---

# Phase 2 Plan 2: Browser URL .html Handling Summary

Client-side .html stripping in Sidebar active state, doc route slug lookup, and WelcomePage Guides href — all three touch-points now handle flat HTML URLs on static hosting.

## What Was Built

Three client-side components updated with defensive `.html` extension handling so the site works correctly when users access flat `.html` files directly on GCS/S3 or any static host that preserves file extensions in browser URLs.

### Changes Made

**Sidebar.tsx** (`derivedActiveId` function, lines 41-44):
- Extracts `rawSlug` from pathname after `/docs/` prefix
- Strips `.html` suffix if present before building `doc-${slug}` id
- Guard ensures SSR prerender path (no extension) is unchanged

**`[...path].tsx`** (`slug` memo, lines 25-28):
- Replaces single-line `params.path || ""` with a 3-line memo
- Strips `.html` from `params.path` before page lookup via `docsManifest.pages.find()`
- Without this: `p.slug === "getting-started"` never matched `params.path === "getting-started.html"`

**WelcomePage.tsx** (Guides CategoryCard href, line 130):
- Appends `.html` to the first doc page href: `/docs/${slug}.html`
- Matches actual flat file output names from Phase 2 Plan 1

## Verification

All success criteria met:

1. `npm test` — 58 tests passed (2 test files)
2. `npm run build` — clean TypeScript compilation
3. Integration build: `node dist/bin/yolodocs.js --schema schema.graphql --output test-output --title "Carl API" --docs-dir ./docs` succeeded
4. `ls test-output/docs/` confirmed flat `.html` files: `getting-started.html`, `authentication.html`, `pagination.html`, `error-handling.html`, plus nested `advanced/` and `guides/` subdirectories with `.html` files
5. `find test-output/docs -name "index.html"` returned empty — no subdirectory index files
6. `test-output/index.html` and `test-output/reference.html` exist

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Task | Hash | Description |
|------|------|-------------|
| Task 1 | c1a23ee | feat(02-02): strip .html extension in Sidebar active state and doc route slug |
| Task 2 | 907570f | feat(02-02): add .html suffix to WelcomePage Guides href; update dist/ |

## Self-Check: PASSED

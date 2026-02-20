---
phase: 01-data-layer
verified: 2026-02-20T13:37:50Z
status: passed
score: 9/9 must-haves verified
re_verification: false
---

# Phase 1: Data Layer Verification Report

**Phase Goal:** The manifest emits a complete, correct 3-level navigation hierarchy with H1-derived titles and slug-safe paths
**Verified:** 2026-02-20T13:37:50Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A docs folder with `product/guides/filtering.md` produces a manifest entry with slug `product/guides/filtering` and a label taken from the file's first H1 (not the filename) | VERIFIED | `scanDir` in loader.ts uses `extractFirstH1` for title; slug is computed from `path.relative(baseDir, fullPath)` with extension stripped; build.test.ts full example test asserts exact anchor `/docs/product/guides/filtering` |
| 2 | Frontmatter `title` overrides H1 when set; filename is used only when both are absent | VERIFIED | loader.ts line 96-99: `(frontmatter.title as string) \|\| h1Title \|\| path.basename(...)`. 4 test cases in loader.test.ts "title priority chain via scanDocsFolder" + 4 integration tests all pass. |
| 3 | Top-level doc folders (`product/`, `developer/`) appear as distinct sidebar sections in the manifest | VERIFIED | build.ts `buildNavigationManifest` uses `sectionMap` keyed by `parts[0]`; emits `{ id: "docs-${sectionKey}", title: toTitleCase(sectionKey), ... }`. build.test.ts test "produces separate NavigationSections per top-level folder" verifies `docs-developer` and `docs-product` section IDs. |
| 4 | Folder group labels are title-cased from directory names (`developer-reference/` becomes "Developer Reference") | VERIFIED | `toTitleCase(s)` at build.ts line 243-245: `s.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())`. build.test.ts "title-cases hyphenated folder names" confirms `developer-reference` -> "Developer Reference". |
| 5 | A build containing a slug collision fails with a descriptive error before prerender runs | VERIFIED | `assertNoSlugCollisions(pages)` called in `scanDocsFolder` before sort (loader.ts line 59). Throws `Error` with message naming both slugs. loader.test.ts "throws with a descriptive message naming both conflicting slugs" verifies regex `/dev\/api.*dev\/api\/intro\|dev\/api\/intro.*dev\/api/`. |

**Score:** 5/5 ROADMAP success criteria verified

### Plan must-have Truths (from PLAN frontmatter)

#### Plan 01-01 Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A markdown file with `# My Title` as first H1 produces a DocsPage with title 'My Title' | VERIFIED | `extractFirstH1` regex `/^#\s+(.+)/m`; scanDir calls it; loader.test.ts "uses H1 when frontmatter title is absent" confirms. |
| 2 | A markdown file with frontmatter `title: Override` and H1 `# Body Title` produces title 'Override' | VERIFIED | Priority chain: frontmatter.title wins; loader.test.ts "uses frontmatter title when set, even if H1 is present" confirms. |
| 3 | A markdown file with no frontmatter title and no H1 produces title from filename | VERIFIED | Fallback to `path.basename(entry.name, path.extname(entry.name))`; loader.test.ts "uses filename when neither frontmatter title nor H1 is present" confirms. |
| 4 | Two slugs where one is a prefix of the other cause a build error with descriptive message | VERIFIED | `assertNoSlugCollisions` throws with both slugs named; loader.test.ts "throws when a slug is a prefix" and "throws with a descriptive message naming both conflicting slugs" confirm. |
| 5 | Slugs with double slashes or trailing slashes are normalized | VERIFIED | loader.ts lines 91-92: `.replace(/\/+/g, "/").replace(/^\/\|\/$/g, "")`. loader.test.ts "produces a clean slug without leading or trailing slashes" and "produces slugs without double slashes" confirm. |

#### Plan 01-02 Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A docs folder with `product/guides/filtering.md` produces a manifest with section 'Product', group 'Guides', and leaf item 'filtering' | VERIFIED | build.test.ts "creates a group item for 3-level slugs" asserts section id `docs-product`, group id `docs-folder-product-guides`, group name "Guides", 2 children with correct anchors. |
| 2 | Top-level folders produce separate NavigationSections with distinct IDs | VERIFIED | sectionMap emits `docs-${sectionKey}` per folder; build.test.ts "produces separate NavigationSections per top-level folder" verifies `docs-developer` and `docs-product` both present. |
| 3 | Root-level pages (no folder) appear in a 'Documentation' section | VERIFIED | rootPages array emitted as `{ id: "docs", title: "Documentation", ... }`; build.test.ts "produces a 'Documentation' section for root-level pages" confirms. |
| 4 | Folder names like `developer-reference` become 'Developer Reference' in section and group labels | VERIFIED | `toTitleCase` called on both sectionKey (line 347) and groupKey (line 333); build.test.ts "title-cases hyphenated folder names for section titles" and "title-cases hyphenated group folder names" confirm. |
| 5 | Groups within a section are sorted alphabetically by folder name; pages within groups sort by order then title | VERIFIED | `sortedGroupKeys` via `[...groups.keys()].sort()` (line 327); `groupPages.sort(sortPages)` where sortPages sorts by order then title (line 329); build.test.ts "sorts pages by order then title within a section" confirms. |

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/markdown/loader.ts` | H1 extraction, title priority chain, slug normalization, collision detection | VERIFIED | 111 lines. Exports `extractFirstH1`, `assertNoSlugCollisions`, `scanDocsFolder`. All four behaviors fully implemented and wired. |
| `src/markdown/loader.test.ts` | Unit tests for loader enhancements (min 80 lines) | VERIFIED | 313 lines. 26 tests covering all specified behaviors plus edge cases. |
| `src/cli/build.ts` | 3-level manifest grouping with multi-section support | VERIFIED | 506 lines. Contains `sectionMap` pattern; exports `toTitleCase`, `buildNavigationManifest`. Fully wired to `docsManifest.pages`. |
| `src/cli/build.test.ts` | Unit tests for manifest restructuring (min 30 lines) | VERIFIED | 463 lines. 32 tests (13 content-splitting + 4 toTitleCase + 15 buildNavigationManifest). |
| `dist/src/cli/build.js` | Compiled output | VERIFIED | Exists. Contains `toTitleCase`, `buildNavigationManifest`, `sectionMap` — matching source. |
| `dist/src/cli/build.d.ts` | Type declarations | VERIFIED | Exists. |
| `dist/src/markdown/loader.js` | Compiled output | VERIFIED | Exists. Contains `extractFirstH1`, `assertNoSlugCollisions`. |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/markdown/loader.ts` | `src/schema/types.ts` | `DocsPage` interface import | VERIFIED | Line 4: `import type { DocsManifest, DocsPage } from "../schema/types.js"` |
| `src/cli/build.ts` | `src/schema/types.ts` | `NavigationSection`, `NavigationManifest` imports | VERIFIED | Lines 14-18: multi-line `import type { NavigationManifest, NavigationSection, ParsedSchema } from "../schema/types.js"` — note: plan pattern `import.*NavigationSection.*types` missed due to multi-line format; actual wiring confirmed by reading file directly. |
| `src/cli/build.ts` | `src/markdown/loader.ts` | consumes `docsManifest.pages` with H1-derived titles | VERIFIED | Lines 53, 91, 102, 262, 264, 269: `docsManifest.pages` iterated in `buildNavigationManifest`; titles come directly from `DocsPage.title` (set by loader with H1 priority chain). |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| DATA-01 | 01-02 | `buildNavigationManifest` parses two levels of path segments for 3-level hierarchy | SATISFIED | `parts.length === 1/2/3+` branching in `buildNavigationManifest`; tested in build.test.ts |
| DATA-02 | 01-01 | `scanDocsFolder` extracts first H1 from markdown body as title source | SATISFIED | `extractFirstH1` called in `scanDir`; 8 H1 tests + 4 title priority tests pass |
| DATA-03 | 01-02 | Docs manifest correctly handles nested slug paths (e.g., `product/guides/filtering`) | SATISFIED | 3+ segment slugs routed to section+group; full example test in build.test.ts passes |
| DATA-04 | 01-01 | No slug collisions between files and folders at the same level | SATISFIED | `assertNoSlugCollisions` enforces this at build time; integration test confirms error thrown |
| NAV-03 | 01-02 | Folder group labels are title-cased from directory names | SATISFIED | `toTitleCase` applied to both section and group keys; 4 toTitleCase tests pass |
| NAV-06 | 01-02 | Top-level docs folders become separate sidebar sections | SATISFIED | `docs-${sectionKey}` sections emitted per top-level folder; verified by 3 tests |
| TITL-01 | 01-01 | Menu item label is derived from first H1 header in markdown content, not filename | SATISFIED | H1 title used when frontmatter absent; 26 loader tests pass including 8 extractFirstH1 tests |
| TITL-02 | 01-01 | Frontmatter `title` takes priority over H1 when explicitly set; filename is last fallback | SATISFIED | Priority chain `frontmatter.title \|\| h1Title \|\| filename`; 4 priority chain tests pass |

**Orphaned requirements check:** REQUIREMENTS.md Traceability table maps DATA-01, DATA-02, DATA-03, DATA-04, NAV-03, NAV-06, TITL-01, TITL-02 all to Phase 1. All 8 are accounted for in the PLAN frontmatter. No orphaned requirements.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | — | — | — | — |

No TODOs, FIXMEs, placeholder returns, or stub implementations found in any phase 1 files.

---

## Human Verification Required

None. All behaviors specified in the phase goal are programmatically verifiable and verified via the test suite (58/58 tests passing).

---

## Test Suite Outcome

```
Test Files: 2 passed (2)
Tests:      58 passed (58)
Duration:   229ms
```

- `src/markdown/loader.test.ts`: 26 tests — all pass
- `src/cli/build.test.ts`: 32 tests — all pass

---

## Summary

Phase 1 goal is fully achieved. All 5 ROADMAP success criteria are verified against actual code. All 8 requirement IDs (DATA-01, DATA-02, DATA-03, DATA-04, NAV-03, NAV-06, TITL-01, TITL-02) are implemented, tested, and marked complete in REQUIREMENTS.md.

Key implementations:
- `extractFirstH1(body)` in `src/markdown/loader.ts` — regex `/^#\s+(.+)/m` with multiline flag; exported and directly unit tested
- Title priority chain `frontmatter.title || h1Title || filename` in `scanDir`
- `assertNoSlugCollisions(pages)` called before sort in `scanDocsFolder` — fails build with descriptive error
- Slug normalization: double-slash collapse, leading/trailing slash strip
- `sectionMap: Map<string, {ungrouped, groups}>` pattern in `buildNavigationManifest` for 3-level grouping
- `toTitleCase(s)` for hyphen-to-Title-Case conversion on section and group labels
- Both `toTitleCase` and `buildNavigationManifest` exported for direct unit testability
- `dist/` compiled and committed alongside source

---

_Verified: 2026-02-20T13:37:50Z_
_Verifier: Claude (gsd-verifier)_

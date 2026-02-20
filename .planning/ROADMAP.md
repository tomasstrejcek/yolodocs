# Roadmap: Yolodocs Documentation UX Improvements

## Overview

Three tightly coupled improvements ship in dependency order: the manifest builder and loader are extended first (data shapes all downstream work), flat HTML output is validated second (URL patterns must be locked before sidebar anchors are written), and the recursive sidebar component plus page rendering cleanup land third (consuming the stable data and URL shapes). The sample docs folder restructuring is bundled into Phase 3 because it validates the full pipeline end-to-end.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (e.g., 2.1): Urgent insertions only

- [x] **Phase 1: Data Layer** - Extend manifest builder and markdown loader to emit 3-level hierarchy with H1-derived titles
- [ ] **Phase 2: Flat HTML Output** - Switch Nitro prerender to flat `.html` files and update all anchor hrefs
- [ ] **Phase 3: Sidebar and Page Rendering** - Recursive sidebar component, active state, page titles, and docs restructuring

## Phase Details

### Phase 1: Data Layer
**Goal**: The manifest emits a complete, correct 3-level navigation hierarchy with H1-derived titles and slug-safe paths
**Depends on**: Nothing (first phase)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, NAV-03, NAV-06, TITL-01, TITL-02
**Success Criteria** (what must be TRUE):
  1. A docs folder with `product/guides/filtering.md` produces a manifest entry with slug `product/guides/filtering` and a label taken from the file's first H1 (not the filename)
  2. Frontmatter `title` overrides H1 when set; filename is used only when both are absent
  3. Top-level doc folders (`product/`, `developer/`) appear as distinct sidebar sections in the manifest
  4. Folder group labels are title-cased from directory names (e.g., `developer-reference/` becomes "Developer Reference")
  5. A build containing a slug collision (file and folder sharing the same basename) fails with a descriptive error before prerender runs
**Plans:** 2/2 plans complete

Plans:
- [x] 01-01-PLAN.md — TDD: Loader enhancements (H1 extraction, slug normalization, collision detection)
- [x] 01-02-PLAN.md — TDD: Manifest restructuring (3-level hierarchy, multi-section, title-casing)

### Phase 2: Flat HTML Output
**Goal**: Prerender produces flat `.html` files and all doc links use `.html`-suffixed paths that work on GCS/S3 without URL rewriting
**Depends on**: Phase 1
**Requirements**: HOST-01, HOST-02, HOST-03, HOST-04
**Success Criteria** (what must be TRUE):
  1. After build, doc pages exist as `docs/architecture.html` (not `docs/architecture/index.html`) in the output directory
  2. Opening a doc page URL directly in a browser on GCS/S3 returns the correct HTML page without a 404
  3. Sidebar anchor hrefs contain the `.html` extension matching the flat file output paths
  4. Active sidebar highlighting works correctly when the browser URL pathname includes the `.html` extension
**Plans**: TBD

### Phase 3: Sidebar and Page Rendering
**Goal**: The sidebar renders all 3 nesting levels with correct active state, collapse persistence, and auto-expansion; page headings and browser titles are clean and per-page
**Depends on**: Phase 2
**Requirements**: NAV-01, NAV-02, NAV-04, NAV-05, NAV-07, TITL-03, TITL-04
**Success Criteria** (what must be TRUE):
  1. A 3-level docs folder (`product/guides/filtering.md`) renders a fully clickable sidebar with section, collapsible group, and leaf link — all three levels visible and navigable
  2. The sidebar group containing the current page is auto-expanded when the user opens that page's URL directly
  3. Expanding and collapsing sidebar groups survives navigation between doc pages without resetting
  4. A markdown page whose content starts with an H1 does not render a duplicate heading above the content
  5. The browser tab title shows the per-page title (e.g., "Getting Started — Carl API") rather than a generic site title
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Data Layer | 2/2 | Complete    | 2026-02-20 |
| 2. Flat HTML Output | 0/TBD | Not started | - |
| 3. Sidebar and Page Rendering | 0/TBD | Not started | - |

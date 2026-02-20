# Requirements: Yolodocs Documentation UX Improvements

**Defined:** 2026-02-20
**Core Value:** Documentation pages must be navigable, correctly titled, and work when opened in new tabs on any static hosting.

## v1 Requirements

### Navigation

- [ ] **NAV-01**: Sidebar renders 3-level folder hierarchy (section → collapsible group → leaf page)
- [ ] **NAV-02**: `SidebarSubGroup` (or replacement) recursively renders nested children up to 3 levels
- [x] **NAV-03**: Folder group labels are title-cased from directory names (e.g., `developer-reference/` → "Developer Reference")
- [ ] **NAV-04**: Active page is visually highlighted in sidebar regardless of nesting depth
- [ ] **NAV-05**: Collapsible sidebar groups retain expanded/collapsed state across page navigation
- [x] **NAV-06**: Top-level docs folders become separate sidebar sections (e.g., `docs/product/` → "Product Docs" section, `docs/developer/` → "Developer Docs" section)
- [ ] **NAV-07**: Sidebar group containing the active page auto-expands on direct URL access

### Titles

- [x] **TITL-01**: Menu item label is derived from first H1 header in markdown content, not filename
- [x] **TITL-02**: Frontmatter `title` takes priority over H1 when explicitly set; filename is last fallback
- [ ] **TITL-03**: Redundant page heading is removed when markdown content already contains an H1
- [ ] **TITL-04**: Browser tab `<title>` tag shows per-page title (e.g., "Getting Started — Carl API")

### Static Hosting

- [x] **HOST-01**: Prerender output produces flat HTML files (e.g., `architecture.html` instead of `architecture/index.html`)
- [x] **HOST-02**: Direct URL access works on GCS/S3 without clean-URL resolution or server-side rewrites
- [x] **HOST-03**: Sidebar anchor hrefs match the flat HTML file paths
- [x] **HOST-04**: Active state derivation handles `.html` extension in URL pathname

### Data Layer

- [x] **DATA-01**: `buildNavigationManifest` parses two levels of path segments for 3-level hierarchy
- [x] **DATA-02**: `scanDocsFolder` extracts first H1 from markdown body as title source
- [x] **DATA-03**: Docs manifest correctly handles nested slug paths (e.g., `product/guides/filtering`)
- [x] **DATA-04**: No slug collisions between files and folders at the same level

## v2 Requirements

### Navigation

- **NAV-V2-01**: Previous/next page navigation at bottom of each doc page
- **NAV-V2-02**: Breadcrumb trail above page content showing folder hierarchy

## Out of Scope

| Feature | Reason |
|---------|--------|
| Unlimited nesting depth | Beyond 3 levels, sidebars become unusable; cap at 3 |
| Hash-based doc navigation | Rejected — flat HTML files solve hosting compatibility more cleanly |
| Filename-prefix ordering (`01-*.md`) | Existing `order` frontmatter field is sufficient |
| GCS/CDN infrastructure configuration | Solving at code level with flat HTML output |
| Dynamic client-side doc loading | Breaks static prerender guarantee |
| Custom sidebar component API | Yolodocs is a generate-and-done CLI tool, not a component framework |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| NAV-01 | Phase 3 | Pending |
| NAV-02 | Phase 3 | Pending |
| NAV-03 | Phase 1 | Complete |
| NAV-04 | Phase 3 | Pending |
| NAV-05 | Phase 3 | Pending |
| NAV-06 | Phase 1 | Complete |
| NAV-07 | Phase 3 | Pending |
| TITL-01 | Phase 1 | Complete |
| TITL-02 | Phase 1 | Complete |
| TITL-03 | Phase 3 | Pending |
| TITL-04 | Phase 3 | Pending |
| HOST-01 | Phase 2 | Complete |
| HOST-02 | Phase 2 | Complete |
| HOST-03 | Phase 2 | Complete |
| HOST-04 | Phase 2 | Complete |
| DATA-01 | Phase 1 | Complete |
| DATA-02 | Phase 1 | Complete |
| DATA-03 | Phase 1 | Complete |
| DATA-04 | Phase 1 | Complete |

**Coverage:**
- v1 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-20*
*Last updated: 2026-02-20 after roadmap creation*

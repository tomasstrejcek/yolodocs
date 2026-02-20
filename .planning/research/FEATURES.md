# Features Research — Documentation Site Navigation & Static Hosting

**Research Date:** 2026-02-20
**Dimension:** Navigation and static hosting for yolodocs documentation sites
**Context:** Multi-tier sidebar menus, page titles from content, flat HTML output for GCS/S3

---

## What We Are Building

Improvements to the yolodocs-generated documentation site:

1. **3-level folder-based sidebar** — category (top section) → subcategory (folder group, collapsible) → page (leaf link)
2. **Page titles from H1** — first H1 in markdown content is the authoritative menu label and page heading; suppress redundant title rendering
3. **Flat HTML output** — `docs/architecture.html` instead of `docs/architecture/index.html`, so direct URL access works on GCS/S3 without URL rewriting
4. **Split docs sections** — product docs and developer docs as separate top-level sidebar sections via folder structure

---

## Current State (Baseline)

| Concern | Current behavior | Gap |
|---------|-----------------|-----|
| Sidebar depth | 2 levels: section → items with optional children rendered as flat `<a>` links (no recursion) | Need 3 levels: section → collapsible group → leaf links |
| `SidebarSubGroup` recursion | Renders `props.item.children` as direct `<a>` links — no sub-group collapsing at third level | `SidebarSubGroup` must recurse to handle deeper nesting |
| Folder grouping | `buildNavigationManifest()` groups by first path segment only; one level of folder nesting | Need two-segment grouping (e.g., `product/auth/oauth.md` → section "Product" → group "Auth" → leaf "OAuth") |
| Title source | `scanDocsFolder` takes `frontmatter.title` then falls back to filename | First H1 in body content is not considered; mismatches possible when frontmatter omitted |
| Page heading rendering | `MarkdownPage` always renders `<h1>{props.title}</h1>` above markdown body | If markdown body starts with `# Getting Started`, a duplicate heading is shown |
| URL structure | SolidStart uses `[...path]` catch-all route → prerender generates `docs/getting-started/index.html` | GCS serves `docs/getting-started` as a directory listing (404) on direct URL access |
| Docs sections | Single "Documentation" sidebar section | No way to split into "Product Docs" / "Developer Docs" etc. |

---

## Table Stakes (Must-Have — Users Leave Without These)

### TS-1: Correct active state in sidebar
**What:** The sidebar link for the current page is visually highlighted. Every doc page has exactly one corresponding sidebar entry.
**Why table stakes:** Users cannot orient themselves without it. Loss of current location = immediate confusion.
**Current state:** Works for 2 levels; breaks if a page has no parent group or if active ID derivation fails on slug mismatch.
**Complexity:** Low — `derivedActiveId()` in Sidebar already derives from `location.pathname`; ensure IDs match slugs.
**Dependencies:** Flat HTML URL changes affect pathname, which affects ID derivation.

### TS-2: Direct URL navigation works (static hosting compatibility)
**What:** `https://docs.example.com/docs/architecture.html` opens correctly when pasted into a new tab or shared. No 404s from the file host.
**Why table stakes:** On GCS/S3 without URL rewriting, `docs/architecture/index.html` is unreachable at URL `docs/architecture`. Users who share doc links find broken URLs.
**Current state:** SolidStart prerenders to `docs/architecture/index.html` by default.
**Complexity:** Medium — requires configuring SolidStart/Nitro prerender to produce `docs/architecture.html` (flat) OR post-processing step to rename files. Also requires sidebar `anchor` values to use `.html` extension or match final URL.
**Dependencies:** Affects all link `href` values in manifest (sidebar anchors), DocsPage route matching, and prerender output paths.

### TS-3: Page title in browser tab / `<title>` tag
**What:** Browser tab shows meaningful title like "Getting Started — Carl API", not just "Carl API" or the route path.
**Why table stakes:** Standard web expectation; required for bookmark usability and shareable links.
**Current state:** `<title>` is set once for the whole site in the site config. Per-page `<title>` is not overridden by MarkdownPage.
**Complexity:** Low — add `<Title>` meta tag in DocsPage route using the resolved page title.
**Dependencies:** Requires accurate title resolution (TS-4).

### TS-4: Menu label matches actual page heading
**What:** The text shown in the sidebar for a page matches the heading shown at the top of the page. No "Getting Started" in menu alongside "# Welcome" on page.
**Why table stakes:** Inconsistency between sidebar and page heading erodes trust. Users question whether they navigated to the right place.
**Current state:** `frontmatter.title` drives both sidebar label and `<h1>` rendered above body. If frontmatter title differs from body H1, both appear as separate headings.
**Complexity:** Low — extract first H1 from markdown body via regex (`/^#\s+(.+)/m`), use as authoritative title. Only fall back to frontmatter then filename.
**Dependencies:** Affects `scanDocsFolder` (loader.ts), manifest building, and `MarkdownPage` (suppress redundant h1).

### TS-5: Collapsible sidebar groups don't lose state on page navigation
**What:** If a user expands "Advanced" in the sidebar and then clicks a page inside it, the group stays expanded after navigation.
**Why table stakes:** Collapsing on each navigation is disorienting and forces re-expansion. Standard behavior across all doc tools (Docusaurus, Mintlify, Nextra).
**Current state:** `createSignal(false)` for collapsed state — resets on every component re-mount (i.e., on every navigation if Shell re-mounts). SolidStart SPA routing may or may not remount Sidebar; needs verification.
**Complexity:** Low-medium — if Sidebar remounts, move initial state to session storage or derive from `hasActiveChild()`.
**Dependencies:** Depends on SolidStart's SPA navigation behavior (whether Sidebar remounts).

---

## Table Stakes (Continued) — Multi-Level Sidebar

### TS-6: 3-level folder-based sidebar rendering
**What:** Docs organized as `product/auth/oauth.md` render as: section "Product Docs" → collapsible group "Auth" → leaf "OAuth". Each level is independently collapsible.
**Why table stakes:** This is the primary deliverable. Without it, the folder-based hierarchy in docs has no visible effect.
**Current state:** `buildNavigationManifest` groups by first path segment only. `SidebarSubGroup` renders children as flat links with no further recursion.
**Complexity:** Medium — two changes required:
  - `buildNavigationManifest`: parse two levels of path segments (folder/subfolder/page)
  - `SidebarSubGroup`: make recursive so it can render a sub-group → items at depth 3
**Dependencies:** URL structure (TS-2), active state (TS-1).

### TS-7: Folder group labels derived from directory name, not filename
**What:** A folder named `developer-reference/` renders in the sidebar as "Developer Reference", not as the literal directory name.
**Why table stakes:** Title-cased, hyphen-stripped labels are the minimum UX expectation. Folder name `getting-started` in the sidebar would look broken.
**Current state:** Already implemented for one level: `folder.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())`. Must be extended to subfolder names at depth 2.
**Complexity:** Trivial — same transform applied to subfolder segment.
**Dependencies:** TS-6.

---

## Differentiators (Competitive Advantage)

### D-1: Separate top-level sidebar sections for product vs developer docs
**What:** Two sibling sections in the sidebar: "Product Documentation" (from `docs/product/`) and "Developer Documentation" (from `docs/developer/`), each independently collapsible.
**Why differentiating:** Most tools give you one flat docs section or require complex config to split. Folder-driven split with zero config is a clean UX win for API doc sites that serve both end-users and integrators.
**Complexity:** Low-medium — top-level folder becomes section ID rather than group. Requires a naming convention or config option to opt specific top-level folders into their own sidebar section.
**Dependencies:** TS-6 (folder grouping), NavigationSection structure already supports multiple doc sections.

### D-2: Auto-open sidebar group containing the active page on first load
**What:** When navigating directly to `docs/developer/auth/oauth.html`, the "Auth" group under "Developer Documentation" auto-expands without user interaction.
**Why differentiating:** Docusaurus does this; Mintlify does this. Users landing on a deep page from a search result or shared link should see where they are in the hierarchy.
**Complexity:** Low — `hasActiveChild()` already checks one level. Extend to check recursively, and initialize `collapsed` based on `hasActiveChild()` result.
**Dependencies:** TS-5, TS-6.

### D-3: Previous / next page navigation at bottom of doc page
**What:** "← Previous: Getting Started" / "Next: Pagination →" links at the bottom of each doc page, following the sidebar order.
**Why differentiating:** Standard in Nextra, Mintlify, Docusaurus. Rare in auto-generated API doc tools. Reduces reliance on sidebar for sequential reading.
**Complexity:** Medium — requires passing ordered page list to MarkdownPage; derive prev/next from flat ordered list in manifest.
**Dependencies:** Title resolution (TS-4) for link labels. Already present as `OperationNav` in the reference page — similar pattern.

### D-4: Breadcrumb trail above page content
**What:** "Product Docs > Authentication > OAuth" shown above the page title.
**Why differentiating:** Helps users orient in a 3-level hierarchy. Especially useful on mobile where the full sidebar may be hidden.
**Complexity:** Low — derive from slug segments + sidebar structure.
**Dependencies:** TS-6 for hierarchy data.

---

## Anti-Features (Deliberately NOT Building)

### AF-1: Unlimited nesting depth
**Rationale:** Beyond 3 levels, sidebars become unusable. Documenting an API does not require taxonomies deeper than category → subcategory → page. Unlimited depth adds recursive rendering complexity with no practical benefit.
**Decision:** Cap at 3 levels. Deeper folder nesting is flattened or ignored.

### AF-2: Hash-based navigation for doc pages
**Rationale:** Considered and explicitly rejected in PROJECT.md. Hash navigation (`/docs#getting-started`) requires all content on one page (bad for SEO, bad for pagefind indexing, bad for sharing individual pages). Flat HTML files solve the static hosting problem more cleanly.
**Decision:** Each doc page is its own HTML file.

### AF-3: Per-page ordering via anything other than frontmatter `order` field
**Rationale:** The existing `order: N` frontmatter field is sufficient. Adding drag-and-drop reordering, filename-prefix ordering (`01-getting-started.md`), or a separate order config file adds complexity without significant user benefit.
**Decision:** Folder structure defines grouping; `order` frontmatter defines sequence within a group.

### AF-4: Runtime server / CDN configuration changes
**Rationale:** The right fix for GCS 404s is flat HTML output, not asking users to configure GCS bucket policies or rewrite rules. Infrastructure-level fixes are outside yolodocs' scope and create a hard dependency on a specific hosting setup.
**Decision:** Solve at code level with flat prerender output.

### AF-5: Dynamic/client-side doc loading
**Rationale:** Adding runtime fetch calls for doc content reintroduces the SPA navigation complexity and breaks the static prerender guarantee. The current `docs-pages/*.js` split pattern already solved the bundling problem cleanly.
**Decision:** All doc content is prerendered at build time.

### AF-6: Custom sidebar component API (user-provided React/Solid components)
**Rationale:** Yolodocs is a "generate and done" CLI tool, not a component framework. Exposing a component API would require versioning, documentation, and breaking change management. Folder structure + frontmatter covers all reasonable customization needs.
**Decision:** No component plugin API.

---

## Feature Dependencies Map

```
TS-4 (title from H1)
  └── TS-3 (browser tab title)
  └── TS-1 (active state) [slug must match derived ID]
  └── D-3 (prev/next labels)

TS-2 (flat HTML URLs)
  └── TS-1 (active state) [pathname changes]
  └── all sidebar anchor hrefs must use .html or omit extension if host supports it

TS-6 (3-level sidebar)
  └── TS-7 (folder labels)
  └── D-1 (split sections)
  └── D-2 (auto-open active group)
  └── D-4 (breadcrumbs)

TS-5 (sidebar state persistence)
  └── D-2 (auto-open active group)
```

---

## Complexity Summary

| Feature | Effort | Risk |
|---------|--------|------|
| TS-1 Active state | Low | Low — slug ↔ ID must stay in sync |
| TS-2 Flat HTML | Medium | Medium — Nitro prerender config; all hrefs must match |
| TS-3 Browser title | Low | Low |
| TS-4 Title from H1 | Low | Low — regex on body content |
| TS-5 Sidebar state | Low-Medium | Low — session storage or derive from active |
| TS-6 3-level sidebar | Medium | Medium — recursive render + manifest building |
| TS-7 Folder labels | Trivial | None |
| D-1 Split sections | Low-Medium | Low |
| D-2 Auto-open group | Low | Low |
| D-3 Prev/next nav | Medium | Low |
| D-4 Breadcrumbs | Low | Low |

---

*Research date: 2026-02-20*

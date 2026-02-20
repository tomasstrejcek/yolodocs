# Project Research Summary

**Project:** yolodocs — multi-level sidebar navigation and flat HTML static output
**Domain:** Static documentation site generator (SolidStart/Nitro, CLI build pipeline)
**Researched:** 2026-02-20
**Confidence:** HIGH

## Executive Summary

This research addresses three tightly coupled improvements to yolodocs: (1) a 3-level folder-based sidebar that maps `docs/product/auth/oauth.md` to a visual hierarchy of section → collapsible group → leaf link, (2) content-derived page titles extracted from the first H1 in markdown body rather than relying solely on frontmatter, and (3) flat HTML output (`docs/page.html` instead of `docs/page/index.html`) for compatibility with GCS/S3 direct static hosting without URL rewriting. The improvements are well-understood, well-scoped, and align with patterns used by Docusaurus, VitePress, and Starlight. The recommended approach requires no new npm dependencies and only targeted changes to four existing files: `loader.ts`, `build.ts`, `app.config.ts`, and `Sidebar.tsx`.

The recommended implementation sequence is data-layer first (manifest builder and loader changes), then URL/routing changes, then sidebar component refactoring, and finally page rendering cleanup. This order is dependency-driven: the recursive `SidebarNavItem` component cannot be built correctly until the manifest emits 3-level data, and flat URL anchors must be set in the manifest before the prerender step so all link `href` values and HTML output paths are consistent. Critically, the `autoSubfolderIndex: false` Nitro config option produces flat HTML output natively — no post-processing rename step is needed, which eliminates a fragile build-time file manipulation concern.

The primary risks are integration hazards rather than design unknowns: slug collisions between files and directories sharing the same basename, prerender route coverage gaps for deeply nested slugs, active-state ID mismatches between the manifest builder and `derivedActiveId()` in `Sidebar.tsx`, and the existing base-path doubling issue documented in PROJECT.md that must be audited before flat URL changes land. All risks have clear prevention strategies via build-time assertions and unit tests using fixture directories. There are no external API dependencies and no third-party services involved.

---

## Key Findings

### Recommended Stack

No new stack additions are required. All three features are implemented using existing dependencies: `solid-js` primitives (`For`, `Show`, `createSignal`, `createMemo`) for recursive sidebar rendering, Nitro's `prerender.autoSubfolderIndex: false` config option for flat HTML output, and a simple regex (`/^#\s+(.+)/m`) on the raw markdown source for H1 extraction. The existing `gray-matter` parser for frontmatter and `marked` for rendering are unchanged.

**Core technologies (unchanged):**
- `solid-js` `For` + `Show` — recursive component rendering — self-referential components are a first-class SolidJS pattern with no limitations
- Nitro `prerender.autoSubfolderIndex: false` — flat HTML file output — first-class config option, documented, production-confirmed on Cloudflare Pages and equivalent static hosts
- Regex `/^#\s+(.+)/m` — H1 title extraction at scan time — zero-dependency, single-pass, matches how Docusaurus/VitePress/Starlight do it
- `fse.ensureDirSync` + `path.join` — nested docs-pages file writing — already used in codebase, works for any depth

### Expected Features

**Must have (table stakes):**
- TS-1 Correct active state in sidebar — users cannot orient without it; ID derivation must survive flat URL pathname changes
- TS-2 Direct URL navigation works on GCS/S3 — broken links on shared URLs are a user-facing defect, not a cosmetic issue
- TS-3 Per-page `<title>` tag — required for bookmark usability and Pagefind search result quality
- TS-4 Menu label matches page heading — sidebar label and page H1 must agree; inconsistency erodes trust
- TS-5 Sidebar group collapse state preserved across navigation — all major doc tools do this; absence is jarring
- TS-6 3-level folder-based sidebar rendering — this is the primary deliverable of the milestone
- TS-7 Folder group labels derived from directory name — title-cased, hyphen-stripped; trivial but required

**Should have (competitive):**
- D-1 Separate top-level sidebar sections (product vs developer docs) — folder-driven section split with zero config
- D-2 Auto-open sidebar group containing active page on first load — expected behavior; Docusaurus and Mintlify do this
- D-3 Previous/next page navigation at bottom of doc page — reduces reliance on sidebar for sequential reading
- D-4 Breadcrumb trail above page content — especially useful on mobile where sidebar may be hidden

**Defer (v2+):**
- Unlimited nesting depth — beyond 3 levels sidebars become unusable; no practical benefit for API docs
- Hash-based navigation — explicitly rejected in PROJECT.md; flat HTML is the correct solution
- Per-page ordering beyond `order` frontmatter — drag-and-drop reordering and filename-prefix systems add complexity without user benefit
- Custom sidebar component API — out of scope for a "generate and done" CLI tool

### Architecture Approach

The architecture is a pipeline from filesystem to static HTML, with all hierarchy logic concentrated in the manifest builder. The recursive `NavigationItem` type already supports arbitrary depth — the only required code change is making `SidebarNavItem` self-referential (currently `SidebarSubGroup` renders children as flat `<a>` tags). The manifest builder (`buildNavigationManifest`) must be extended to parse two path segments instead of one, treating all top-level doc folders as distinct sidebar sections and subfolders as collapsible groups. All section/group/leaf mapping logic lives exclusively in `build.ts`; sidebar components receive fully-structured data and are unaware of the product vs developer distinction.

**Major components:**
1. `loader.ts` (`scanDocsFolder`) — filesystem walk, frontmatter parse, H1 extraction; produces flat `DocsManifest`
2. `build.ts` (`buildNavigationManifest`) — converts flat page list into 3-level `NavigationManifest`; controls anchor format (`.html` suffix), section splitting by top-level folder, and docs-pages file writing
3. `app.config.ts` — adds `autoSubfolderIndex: false` to Nitro prerender config; single-line change, large impact
4. `Sidebar.tsx` / `SidebarNavItem` — replaces `SidebarSubGroup` with recursive component; adds `hasActiveDescendant()` helper; strips `.html` from pathname in `derivedActiveId()`
5. `MarkdownPage.tsx` — strips leading H1 from content body before rendering to prevent duplicate headings
6. `[...path].tsx` (DocsPage route) — adds per-page `<Title>` injection for Pagefind search quality

### Critical Pitfalls

1. **Slug collision: file and directory share same basename** (P1) — `developer/api.md` and `developer/api/intro.md` produce conflicting slugs; add build-time slug uniqueness assertion and unit test with name-clash fixture
2. **Active ID mismatch between manifest and `derivedActiveId()`** (P6) — manifest uses `doc-${slug}` (slash-separated); `derivedActiveId()` derives the same format from pathname; any divergence breaks active highlighting silently; share a single ID-construction function between builder and sidebar
3. **`SidebarSubGroup` silently drops third level** (P5) — current component renders grandchildren as nothing; manifest may contain 3-level items but sidebar DOM omits them with no error; must be replaced with recursive `SidebarNavItem` in the same commit as manifest changes
4. **Base-path doubling breaks nested page URLs** (P7) — known issue in PROJECT.md; Nitro with `baseURL` set may double-prefix output paths; audit current output layout with `YOLODOCS_DEBUG=1` before implementing flat URL changes
5. **Pagefind indexes generic site title instead of page H1** (P11) — all doc pages produce identical search result titles until per-page `<Title>` is injected in `[...path].tsx`; must be addressed in the same phase as H1 title derivation

---

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Data Layer — Loader and Manifest Builder

**Rationale:** All other work is blocked on this. The sidebar component cannot be made recursive until the manifest emits 3-level data. Flat URL anchors must be set here before prerender runs. H1 extraction belongs here because it runs at scan time, not render time.

**Delivers:** Correct `manifest.json` with 3-level hierarchy and `.html` anchors; H1-derived titles in manifest; slug normalization and uniqueness assertion

**Addresses features:** TS-4 (title from H1), TS-6 (3-level hierarchy), TS-7 (folder labels), D-1 (split sections)

**Avoids pitfalls:** P1 (slug collisions — add assertion here), P10 (slug path normalization — normalize in `scanDir`), P12 (backward compat — define and document sort rules for mixed flat/nested pages)

**Files:** `src/markdown/loader.ts`, `src/cli/build.ts`

---

### Phase 2: Flat HTML Output

**Rationale:** Independent of sidebar recursion but must be validated before Phase 3 because it changes anchor formats and URL patterns that Phase 3 sidebar code consumes. Audit base-path behavior first to avoid the known doubling issue.

**Delivers:** `docs/{slug}.html` flat output from Nitro prerender; all sidebar anchors using `.html` suffix; GCS/S3 direct URL compatibility

**Addresses features:** TS-2 (direct URL navigation)

**Avoids pitfalls:** P2 (prerender coverage — add post-build assertion), P3 (nested slug flat output — `autoSubfolderIndex: false` handles all depths), P7 (base-path doubling — audit with `YOLODOCS_DEBUG=1` before changing routes)

**Files:** `src/site/app.config.ts` (one-line Nitro config), `src/cli/build.ts` (anchor generation)

---

### Phase 3: Recursive Sidebar Component

**Rationale:** Unblocked once Phase 1 manifest shape is stable. Pure UI work. Must land in the same commit as the 3-level manifest changes to prevent the silent third-level drop (P5).

**Delivers:** Recursive `SidebarNavItem` replacing `SidebarSubGroup`; `hasActiveDescendant()` for auto-expand; `.html` suffix stripped from pathname in `derivedActiveId()`; correct active state at all nesting depths

**Addresses features:** TS-1 (active state), TS-5 (collapse state persistence), TS-6 (3-level rendering), D-2 (auto-open active group)

**Avoids pitfalls:** P5 (third level silently dropped — replaced in same commit), P6 (ID mismatch — shared ID construction function), P9 (auto-collapse loses active context — recursive `hasActiveDescendant()` initializes collapse correctly)

**Files:** `src/site/src/components/layout/Sidebar.tsx`

---

### Phase 4: Page Rendering and Metadata

**Rationale:** Self-contained rendering concerns that are independent of all other phases. Can be done in parallel with Phase 2 or 3, but grouping them avoids scattered small commits.

**Delivers:** H1 stripped from markdown body before rendering (no duplicate headings); per-page `<title>` injection in DocsPage route; accurate Pagefind search result titles; per-page browser tab titles

**Addresses features:** TS-3 (browser title), TS-4 (title from H1, rendering side), D-4 breadcrumbs (optional, low effort, fits here)

**Avoids pitfalls:** P4 (H1 markup in sidebar labels — strip inline markdown before storing title), P11 (Pagefind generic titles — `<Title>` component in `[...path].tsx`)

**Files:** `src/site/src/components/markdown/MarkdownPage.tsx`, `src/site/src/routes/docs/[...path].tsx`

---

### Phase 5: Docs Content Restructuring and Differentiators

**Rationale:** Last because it is content, not code. Restructuring `docs/` into `product/` and `developer/` subdirectories only works correctly after the build pipeline handles it. Differentiators (prev/next nav, breadcrumbs) are additive and low-risk.

**Delivers:** Sample `docs/` folder restructured as `docs/product/` and `docs/developer/`; prev/next navigation at bottom of doc pages; breadcrumb trail

**Addresses features:** D-1 (split sections — now validated by real content), D-3 (prev/next nav), D-4 (breadcrumbs if not done in Phase 4)

**Avoids pitfalls:** P2 (prerender coverage — integration test with 3-level fixture), P8 (glob key matching for nested slugs — validated with restructured docs)

**Files:** `docs/` directory restructuring; `src/site/src/routes/docs/[...path].tsx` (prev/next), `src/site/src/components/markdown/MarkdownPage.tsx` (breadcrumbs)

---

### Phase Ordering Rationale

- **Data before UI:** Phases 1 → 3 enforce the dependency that sidebar components render manifest-defined data. Building the component before the data shape is stable causes rework.
- **Flat URLs early:** Phase 2 before Phase 3 ensures that by the time sidebar anchors are tested in the browser, the `.html` suffix is already present and `derivedActiveId()` is written to match it.
- **Page rendering independent:** Phase 4 has no dependencies on Phase 2 or 3 and could be done at any time, but grouping it avoids scattered changes to `MarkdownPage.tsx`.
- **Content last:** Restructuring the `docs/` folder before the build pipeline handles 3-level paths would produce broken sidebar output.
- **Pitfall avoidance through ordering:** P7 (base-path doubling) requires an audit step at the start of Phase 2, not at the end. Catching it early avoids integrating flat URL logic on top of a broken baseline.

### Research Flags

Phases with well-documented patterns (skip research-phase):
- **Phase 1:** Regex-based H1 extraction and manifest builder refactoring are pure Node.js/TypeScript with no external APIs. Standard patterns.
- **Phase 3:** Recursive SolidJS components are canonical SolidJS patterns. `For` + `Show` + `createSignal` are well-documented.
- **Phase 4:** `<Title>` injection via `@solidjs/meta` and H1 stripping are both trivial.
- **Phase 5:** Content restructuring is file operations, no research needed.

Phases likely needing deeper research during planning:
- **Phase 2:** `autoSubfolderIndex: false` behavior with the existing `baseURL` setting has a known doubling issue (P7). Requires a `YOLODOCS_DEBUG=1` audit of current Nitro output layout before implementation to confirm the correct approach. The interaction between `baseURL`, `prerender.routes`, and `autoSubfolderIndex` may have version-specific behavior in the Nitro version pinned by the project.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | No new dependencies; all solutions use existing APIs with known behavior in the current codebase |
| Features | HIGH | Feature set is clearly scoped from PROJECT.md requirements; table stakes / differentiator split is well-defined |
| Architecture | HIGH | Existing component boundaries are clear; all recommended changes are additive or targeted replacements |
| Pitfalls | HIGH | 12 specific pitfalls identified with concrete symptoms, prevention strategies, and affected phases |

**Overall confidence:** HIGH

### Gaps to Address

- **Nitro `autoSubfolderIndex` + `baseURL` interaction (P7):** The exact behavior when both are set depends on the Nitro version pinned by the project. Run `YOLODOCS_DEBUG=1` build audit at the start of Phase 2 to confirm output layout before committing to the flat URL strategy. The `autoSubfolderIndex: false` approach is the recommended path, but the base-path doubling issue may require a route adjustment first.
- **`import.meta.glob` on Windows (P8):** Slug path separator normalization on Windows is a low-probability risk for this macOS/Linux project but should be included in the slug normalization step (forward-slash enforcement) regardless.
- **Sidebar collapse state across SPA navigation (TS-5):** Research notes this depends on whether SolidStart remounts `Sidebar` on navigation. This should be empirically verified during Phase 3 implementation; if remounting occurs, session storage initialization of collapse state is the fallback.

---

## Sources

### Primary (HIGH confidence)
- SolidJS official documentation — `For`, `Show`, `createSignal`, recursive component patterns
- Nitro documentation (nitro.build/config) — `prerender.autoSubfolderIndex`, `baseURL`, `prerender.routes`
- Existing yolodocs codebase (`src/markdown/loader.ts`, `src/cli/build.ts`, `src/site/src/components/layout/Sidebar.tsx`) — direct inspection of current behavior and gap analysis

### Secondary (MEDIUM confidence)
- Docusaurus documentation — sidebar category recursion pattern, `DocSidebarItemCategory` component pattern
- VitePress documentation — `items[]` nesting and recursive `VPSidebarItem` rendering
- Starlight (Astro) documentation — filesystem-derived sidebar autogeneration

### Tertiary (LOW confidence)
- `vitepress-sidebar` community plugin — confirms VitePress recursive manifest structure pattern
- Cloudflare Pages and GCS static hosting documentation — confirms flat `.html` files work without URL rewriting

---

*Research completed: 2026-02-20*
*Ready for roadmap: yes*

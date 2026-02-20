# Architecture Research: Multi-Tier Sidebar Navigation and Flat Static Output

**Research Type:** Project Research — Architecture dimension
**Date:** 2026-02-20
**Question:** How are multi-level documentation sidebars and flat-file static output typically structured? What are the component patterns and data flow for recursive navigation?

---

## Findings

### 1. Current State of the System

The existing system has a 2-level navigation model with a single non-recursive `SidebarSubGroup` component. Understanding the current architecture is the baseline for what needs to change.

**Current sidebar component tree:**

```
Sidebar
  SidebarSection (one per manifest section: docs, queries, mutations, ...)
    SidebarSubGroup (renders when item has .children)
      <ul> with flat <a> links — NO further recursion
    <a> (leaf items without children)
```

**Current data shape (NavigationItem in `src/schema/types.ts`):**

```typescript
interface NavigationItem {
  id: string;
  name: string;
  anchor: string;
  description: string;
  children?: NavigationItem[];  // only one level deep in practice
}
```

The `children` field is typed recursively already but `SidebarSubGroup` renders children as flat `<a>` tags without checking for grandchildren. Adding a third level requires making the rendering recursive, not the data type.

**Current docs folder scanning (`src/markdown/loader.ts`):**

The loader already does recursive `scanDir()` but the slug captures the full relative path (`advanced/custom-scalars`, `guides/filtering`). The manifest builder in `build.ts` splits only on the first `/` (one folder level), so `advanced/custom-scalars/detail` would be grouped under `advanced` but the grandchild structure would be lost in the navigation manifest.

**Current routing (`src/site/src/routes/docs/[...path].tsx`):**

Uses SolidStart's catch-all route `[...path]` which matches any depth: `/docs/getting-started`, `/docs/advanced/custom-scalars`, `/docs/product/auth/oauth`. The route itself already supports arbitrary depth. The constraint is the URL pattern being resolved from the content module glob (`../../data/docs-pages/${slug}.js`), which also already supports subdirectory slugs via `fse.ensureDirSync(path.dirname(pageFile))`.

**Current URL output (SolidStart static preset):**

SolidStart's Nitro prerender generates `docs/getting-started/index.html` from route `/docs/getting-started`. This requires the static host to resolve clean URLs (`/docs/getting-started` → `getting-started/index.html`). GCS does not do this, causing direct-link 404s.

---

### 2. Component Patterns for Recursive Navigation

#### Pattern: Self-Referential Render Component

The standard approach for recursive tree rendering in SolidJS is a component that calls itself via `Dynamic` or by defining a local helper that imports itself. Since SolidStart compiles TSX, the cleanest method is a separate named component that accepts an `item: NavigationItem` and depth level, then renders children by calling itself.

**Recommended component structure for 3-level support:**

```
Sidebar                         (reads manifest.sections, renders SidebarSection per section)
  SidebarSection                (collapsible section header + list of items)
    SidebarNavItem              (renders one item; recurses for children up to depth limit)
      SidebarNavItem (depth=1)  (subcategory — folder group with collapse button)
        SidebarNavItem (depth=2)(leaf page link)
```

`SidebarNavItem` is the recursive unit. It receives `item`, `depth`, `activeId`, `isDocSection`, and `onNavigate`. When `depth >= maxDepth` (3) or `item.children` is empty, it renders an `<a>`. Otherwise it renders a collapsible button + nested `<ul>` containing more `SidebarNavItem` instances.

**Active state propagation:** Each level needs to know if any descendant is active to remain expanded. This requires walking the subtree: `hasActiveDescendant(item, activeId)` that recurses into children. This is a pure function over the manifest data, computed as a `createMemo` in each `SidebarNavItem`.

**Collapse state:** Each non-leaf item holds its own `createSignal(false)` for collapse. Auto-expand when `hasActiveDescendant()` is true (or derive initial expanded state from it).

#### Pattern: Section Split for "Product Docs" vs "Developer Docs"

The project requires splitting docs into two top-level sidebar sections based on folder structure. This is achieved in `buildNavigationManifest()` by treating `product/` and `developer/` as section-level folders rather than group-level folders. The logic becomes:

- Top-level folders whose names match configured section names → become separate `NavigationSection` entries (e.g., `id: "docs-product"`, `id: "docs-developer"`)
- Subfolders within them → become `NavigationItem` group nodes with children (the subcategory level)
- Files within subfolders → leaf `NavigationItem` entries

The manifest builder is the only place this mapping logic lives; the sidebar components are generic and unaware of the "product vs developer" distinction.

---

### 3. Data Flow: Markdown Files to HTML Output

```
docs/ (filesystem)
  product/
    auth/
      oauth.md          frontmatter: { title, order }
      api-keys.md
    billing.md
  developer/
    contributing.md
  getting-started.md    (root-level; no folder section)

        |
        v

src/markdown/loader.ts  scanDocsFolder()
  - Recursive scanDir()
  - Parses frontmatter via gray-matter
  - Produces slug = relative path without extension
    e.g., "product/auth/oauth", "developer/contributing", "getting-started"
  - Extracts first H1 from content body (NEW: for title derivation)
  - DocsPage: { slug, title, category?, order, content }

        |
        v

src/cli/build.ts  buildNavigationManifest()
  - Groups slugs by depth:
      depth-0 → root items (no slash)
      depth-1 folder → NavigationItem group (if not a section-level folder)
      section-level folder → NavigationSection
  - Produces NavigationManifest.sections[]
    Each section has items[]; items may have children[]; children may have children[]
  - Writes manifest.json (sidebar structure)
  - Writes docs-manifest.json (page metadata only, no content)
  - Writes docs-pages/{slug}.js (content as individual ES modules)

        |
        v

SolidStart prerender (vinxi + Nitro)
  - Route: docs/[...path].tsx
  - Prerender list: derived from docs-manifest.json pages[].slug
  - For each slug, renders DocsPage component → static HTML

        |  (current: index.html in subdir)
        v  (target: flat .html file)

Output directory
  Current:  docs/product/auth/oauth/index.html  (broken on GCS)
  Target:   docs/product/auth/oauth.html         (works on GCS)
```

**Flat HTML output mechanism:**

SolidStart/Nitro supports a `prerender.routes` list. Currently routes are `/docs/${slug}`. To get flat output, the route must be `/docs/${slug}.html` and the links/anchors throughout the site must point to `.html` URLs. The SolidStart static preset copies prerendered routes verbatim: a route `/docs/oauth.html` becomes `docs/oauth.html` in output.

Alternative: keep clean-URL routes but post-process output — rename each `slug/index.html` to `slug.html` after build. This avoids touching SolidStart routing and link generation. The post-process step runs in `build.ts` between the Nitro output copy and pagefind indexing.

The post-process approach is lower-risk because it keeps the SolidJS router working normally during dev mode (vinxi dev server handles clean URLs). The renaming only applies to production output.

**Active-state derivation for flat URLs:**

The sidebar currently derives active state for doc pages via `location.pathname`:

```typescript
const docsPrefix = withBase("/docs/");
if (pathname.startsWith(docsPrefix)) {
  const slug = pathname.slice(docsPrefix.length);
  return `doc-${slug}`;
}
```

For flat HTML URLs the pathname will be `/docs/product/auth/oauth.html`. The slug extraction must strip the `.html` suffix:

```typescript
const slug = pathname.slice(docsPrefix.length).replace(/\.html$/, "");
return `doc-${slug}`;
```

This is the only sidebar change needed for flat URL compatibility.

---

### 4. Component Boundaries

| Component | Responsibility | Inputs | Outputs |
|-----------|---------------|--------|---------|
| `scanDocsFolder()` | Walk filesystem, parse markdown, extract frontmatter + H1 title | Docs directory path | `DocsManifest` (pages with content) |
| `buildNavigationManifest()` | Convert flat page list into hierarchical section/item tree | `DocsManifest`, `ParsedSchema`, base path | `NavigationManifest` written to `manifest.json` |
| `Sidebar` | Read manifest, render section list, derive active item from URL | `manifest.json` (imported), URL via `useLocation()` | Navigation tree DOM |
| `SidebarSection` | Collapsible section with item list | Section data, activeId | Section DOM with items |
| `SidebarNavItem` | Recursive nav node: either link or collapsible group | `NavigationItem`, depth, activeId, isDocSection | `<a>` or `<button>` + nested `<ul>` |
| `DocsPage` route | Load and render single markdown page | URL params (slug), `docs-manifest.json`, `docs-pages/${slug}.js` | Rendered HTML via `MarkdownPage` |
| `MarkdownPage` | Render markdown to HTML, optionally suppress redundant H1 | `content`, `title` | Styled markdown DOM |
| `build.ts` post-process | Rename `slug/index.html` → `slug.html` in output | Output directory | Flat HTML files |

**Boundaries that must NOT be crossed:**

- The manifest builder (`build.ts`) is the only place that knows about folder-to-section mapping rules. Sidebar components receive already-structured data.
- `SidebarNavItem` must not import or know about `manifest.json` directly — it receives data via props from `SidebarSection`.
- Flat URL post-processing is a build-time concern only. Site components derive slug from URL but remain unaware of file layout.

---

### 5. Build Order (Dependency Graph)

Changes have dependencies between them. The correct build order for implementation:

**Phase 1 — Data layer (no UI changes)**
1. `src/schema/types.ts`: Add `subcategory?: string` to `NavigationItem` if needed for 3-level grouping metadata; confirm existing `children?: NavigationItem[]` is sufficient.
2. `src/markdown/loader.ts`: Add H1 extraction from markdown body as fallback/override for `title`. This is pure logic with no downstream deps during this phase.
3. `src/cli/build.ts` — `buildNavigationManifest()`: Extend folder grouping to support 3 levels (section → group → leaf). Add logic for configured section-level folders (e.g., `product`, `developer`). This produces correct `manifest.json`.

**Phase 2 — Routing and URL changes**
4. Determine flat URL strategy (post-process rename vs route suffix). Post-process is recommended. Add `flattenHtmlOutput(outputDir)` helper to `build.ts` that renames `*/index.html` to `*.html` within the docs subtree.
5. Update `withBase` links in sidebar and anywhere `anchor` is constructed to use `.html` suffix for doc pages, OR leave anchors alone and handle via post-process rename (cleaner).

**Phase 3 — Sidebar components**
6. `src/site/src/components/layout/Sidebar.tsx`: Replace `SidebarSubGroup` with recursive `SidebarNavItem`. Implement `hasActiveDescendant()` helper. Update slug derivation to strip `.html` suffix.
7. Remove `SidebarSubGroup` entirely once `SidebarNavItem` handles all levels.

**Phase 4 — Page rendering**
8. `src/site/src/components/markdown/MarkdownPage.tsx`: Add logic to suppress the top-level `<h1>` rendered by the component when the markdown content already begins with an H1. This prevents title duplication.

**Phase 5 — Docs sample restructuring**
9. Restructure `docs/` folder into `product/` and `developer/` subdirectories. This is content, not code, but it must come after the build logic handles it correctly.

**Dependency constraints:**
- Phase 3 (sidebar) depends on Phase 1 (manifest shape) because the component tree renders what the manifest contains.
- Phase 2 (flat URLs) is independent of Phase 3 (sidebar recursion) — they can be parallelized.
- Phase 4 (H1 suppression) is independent of all others — it is a self-contained rendering concern.
- Phase 1 step 2 (H1 extraction in loader) must precede Phase 4 if the H1 is extracted at build time and stored in the manifest; if extracted client-side from rendered HTML, the order is independent.

---

### 6. Key Design Decisions for Implementation

**Decision: Where to extract H1 title**

Option A: In `loader.ts` during scan — parse the markdown body with a regex (`/^#\s+(.+)$/m`) to find the first H1. Store as `h1Title` on `DocsPage`. The manifest builder uses `h1Title ?? frontmatterTitle ?? filename`.

Option B: In `MarkdownPage.tsx` at render time — parse the rendered HTML to find the first `<h1>` and suppress/extract it. More complex, no benefit over Option A.

Recommendation: Option A. Single source of truth at build time.

**Decision: Flat URL implementation**

Post-process rename in `build.ts` after Nitro output is copied. Steps:
1. Walk `outputDir/docs/` recursively.
2. For each `{slug}/index.html` found (where `slug` is not the docs root), rename to `{slug}.html` and remove the empty directory.
3. Update links: because SolidJS router generates links from the `anchor` field in `manifest.json`, and `anchor` is built in `buildNavigationManifest()`, change the anchor format for doc items from `${base}/docs/${slug}` to `${base}/docs/${slug}.html`.

The `anchor` field is what gets rendered as `href` in the sidebar and what Nitro prerenders as routes. So the anchor must be `.html` for prerendering to produce the right file name OR the post-process must handle the rename. Both produce the same result; using `.html` anchors + direct prerender is cleaner because it avoids a post-process pass.

**Decision: Section-level folder detection**

The manifest builder needs to know which top-level folders are "section-level" (becoming separate sidebar sections) vs "group-level" (becoming collapsible groups within a section).

Two approaches:
- Convention-based: folders named `product`, `developer`, or matching a configured list
- Structural: all top-level folders become sections (simplest, no config needed)

The PROJECT.md requirement is "Split docs into product docs and developer docs sections via folder structure." The simplest interpretation is: all top-level folders in the docs directory create their own sidebar section. Root-level files (no folder) go into a default "General" or "Documentation" section. This requires no configuration and matches the folder-is-truth principle from the key decisions.

---

## Summary

### Component Boundaries (Explicit)

- **`loader.ts`**: Filesystem → `DocsManifest`. Adds H1 extraction.
- **`build.ts` manifest builder**: `DocsManifest` + `ParsedSchema` → `NavigationManifest`. Handles 3-level grouping and section splitting by top-level folder.
- **`Sidebar`**: `manifest.json` + URL → navigation DOM. Delegates to `SidebarSection`.
- **`SidebarSection`**: One section's items → collapsible section DOM. Delegates to `SidebarNavItem`.
- **`SidebarNavItem`** (new, replaces `SidebarSubGroup`): Single nav item with recursive children rendering. Self-contained collapse state and active-descendant detection.
- **`MarkdownPage`**: `content` + `title` → rendered HTML. Suppresses H1 when content starts with one.
- **`DocsPage` route**: URL slug → load content module → render `MarkdownPage`.

### Data Flow Direction (Explicit)

```
docs/*.md (filesystem)
  → loader.ts (scanDocsFolder)
    → DocsManifest { pages[]: { slug, title, h1Title, order, content } }
      → build.ts (buildNavigationManifest)
        → manifest.json { sections[]: { items[]: { children[]: NavigationItem } } }
          → Sidebar.tsx (reads manifest.json, useLocation())
            → SidebarSection → SidebarNavItem (recursive) → DOM

      → docs-manifest.json { pages[]: { slug, title, order } }  (no content)
      → docs-pages/{slug}.js  (content only, per file)
        → DocsPage route (import.meta.glob lazy load by slug)
          → MarkdownPage → marked → innerHTML → static HTML (prerender)

build.ts post-process (or Nitro direct .html routes)
  → flat HTML output: docs/{slug}.html instead of docs/{slug}/index.html
```

### Build Order Implications

1. Implement manifest builder changes (3-level grouping, section splitting) first — this unblocks all other work.
2. Implement H1 extraction in loader — this unblocks title accuracy in manifest and MarkdownPage.
3. Implement flat URL anchors in manifest builder — this changes what anchors are emitted, which affects prerender routes.
4. Implement recursive `SidebarNavItem` — this is pure UI work, unblocked once manifest shape is stable.
5. Implement H1 suppression in `MarkdownPage` — independent, can be done anytime.
6. Restructure `docs/` folder content — last, after build pipeline handles it.

---

*Research complete: 2026-02-20*

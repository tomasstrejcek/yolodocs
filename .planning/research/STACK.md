# Stack Research — Navigation & Static Hosting for Yolodocs

**Research Date:** 2026-02-20
**Dimension:** Stack approaches for multi-tier sidebar navigation and flat HTML static output
**Context:** Subsequent research — existing system already understood. Focus on what's needed for 3-level sidebar, flat HTML output, and content-derived titles.

---

## Scope

Three specific technical problems, each with a well-defined answer:

1. **Recursive sidebar in SolidJS** — how to render 3-level collapsible navigation without adding dependencies
2. **Flat HTML output from SolidStart/Nitro** — `architecture.html` instead of `architecture/index.html` for GCS/S3 compatibility
3. **Content-derived titles** — extracting first H1 from markdown body at scan time

---

## 1. Recursive Sidebar Navigation in SolidJS

### The Problem

The current `SidebarSubGroup` component renders children as flat `<a>` links with no further nesting. It does not recurse. Adding a third level (subcategory → leaf page) requires the component to call itself.

### Approach: Self-Referential Component Function

SolidJS supports recursive JSX components natively — a component can call itself in its return value. The `For` primitive handles reactive arrays at each level. No library is needed.

**Recommended pattern:**

```tsx
// Replace SidebarSubGroup with a recursive SidebarNavNode
function SidebarNavNode(props: {
  item: NavItem;          // NavItem has optional children?: NavItem[]
  activeId?: string;
  isDocSection: boolean;
  onNavigate?: () => void;
  depth: number;          // 0 = section item, 1 = subgroup, 2 = leaf at depth 3
}) {
  const hasChildren = () => (props.item.children?.length ?? 0) > 0;
  const [collapsed, setCollapsed] = createSignal(
    // Auto-expand if any descendant is active
    !hasActiveDescendant(props.item, props.activeId)
  );

  return (
    <Show
      when={hasChildren()}
      fallback={<SidebarLeaf item={props.item} ... />}
    >
      <li>
        <button onClick={() => setCollapsed(c => !c)}>{props.item.name}</button>
        <Show when={!collapsed()}>
          <ul>
            <For each={props.item.children}>
              {(child) => (
                <SidebarNavNode
                  item={child}
                  activeId={props.activeId}
                  isDocSection={props.isDocSection}
                  onNavigate={props.onNavigate}
                  depth={props.depth + 1}
                />
              )}
            </For>
          </ul>
        </Show>
      </li>
    </Show>
  );
}
```

**Key SolidJS behavior notes:**

- `createSignal` inside a component is fine for collapsed state; it is scoped per `For` iteration (each rendered child gets its own signal).
- `Show` is preferred over ternary for conditionally rendering children in SolidJS because it preserves proper disposal semantics. Use `Show` instead of `{condition && <Component />}` to avoid premature cleanup.
- SolidJS `For` is keyed by item reference by default; pass `keyed` prop if items are primitives. For object items with `id`, identity is preserved naturally.
- Depth tracking via a `depth` prop is optional but recommended for applying different visual indentation classes at each level (`ml-3` vs `ml-5` vs `ml-7`).

**Active state initialization:**

The current `hasActiveChild()` checks only one level of children. For a recursive tree, write a recursive helper:

```ts
function hasActiveDescendant(item: NavItem, activeId?: string): boolean {
  if (!activeId || !item.children) return false;
  return item.children.some(
    child => child.id === activeId || hasActiveDescendant(child, activeId)
  );
}
```

Initialize `collapsed` to `!hasActiveDescendant(props.item, props.activeId)` so any group containing the current page starts expanded. This is the behavior users expect from Docusaurus, VitePress, and Starlight.

**Confidence: High.** This is standard SolidJS; no experimental APIs. The `For` + `Show` combination is the canonical pattern in the official SolidJS docs. Recursive JSX components have no known limitations in SolidJS or SolidStart.

---

### How Other Tools Handle This

**Docusaurus** — Sidebar items are a typed tree: `{ type: 'category', label, items: SidebarItem[] }`. The `DocSidebarItemCategory` React component recurses into `items` by rendering itself for subcategories. Each category maintains local `isCollapsed` state initialized from whether it contains the current page. Folder-based auto-generation adds `_category_.json` metadata (label, position, collapsible) per directory — the directory itself does not become a navigable link unless a special index doc is linked.

**VitePress** — Sidebar config is a plain JSON-like object with `items` arrays. VitePress renders recursively in its `VPSidebarItem` Vue component. Auto-sidebar plugins (e.g., `vitepress-sidebar`) walk the filesystem recursively and produce the same nested object structure. VitePress supports up to 6 nesting levels but recommends capping at 3 for usability.

**Starlight (Astro)** — Autogenerated sidebars use filesystem hierarchy; each directory becomes a sidebar group. Label is derived from directory name with title-casing. Ordering uses numeric prefixes (e.g., `01-getting-started.md`) or a `sidebar` frontmatter field. Starlight's recursive component overrides are possible but the built-in autogenerate handles depth correctly.

**Takeaway for yolodocs:** The pattern is universal — represent the nav tree as a recursive data structure (`NavItem[]` with optional `children: NavItem[]`), build it from the filesystem at manifest-generation time, and render it with a self-calling component. This is exactly what the existing `NavigationItem` type already supports. No architectural change is needed, only:
1. `buildNavigationManifest()` must parse two path segments (folder + subfolder) instead of one.
2. `SidebarSubGroup` must be replaced with a recursive `SidebarNavNode`.

---

## 2. Flat HTML Output — SolidStart / Nitro

### The Problem

SolidStart's static preset prerenders `/docs/architecture` to `.output/public/docs/architecture/index.html` by default. GCS and S3 static hosting cannot resolve `docs/architecture` to `docs/architecture/index.html` without explicit URL rewriting configuration, causing 404s on direct URL access and shared links.

### Solution: `autoSubfolderIndex: false` in Nitro Prerender Config

Nitro (the server engine underlying SolidStart) exposes an `autoSubfolderIndex` option in the `prerender` block. When set to `false`, Nitro generates `docs/architecture.html` directly instead of `docs/architecture/index.html`.

**Exact configuration in `/Users/tomasstrejcek/Dev/yolodocs/src/site/app.config.ts`:**

```typescript
export default defineConfig({
  server: {
    baseURL: base || undefined,
    preset: "static",
    prerender: {
      routes: prerenderRoutes,
      crawlLinks: true,
      failOnError: true,
      autoSubfolderIndex: false,   // ADD THIS
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
```

**What changes downstream:**

- `docs/getting-started/index.html` → `docs/getting-started.html`
- `docs/product/auth/oauth/index.html` → `docs/product/auth/oauth.html`
- `index.html` and `reference/index.html` are unaffected (root-level routes get `index.html` even with `autoSubfolderIndex: false` because they already have no subdirectory to collapse)

**Sidebar anchor values must change to match.** Currently `buildNavigationManifest()` generates anchors like `${base}/docs/${slug}` (no extension). With flat HTML output, the anchor should be `${base}/docs/${slug}.html`. The `derivedActiveId()` function in Sidebar.tsx matches by `location.pathname`, which will be `/docs/architecture.html` with flat files — this must match the `doc-${slug}` ID pattern used in the manifest.

**Confidence: High.** `autoSubfolderIndex` is a first-class Nitro config option documented on nitro.build/config and confirmed working in SolidStart apps (used in production configs for Cloudflare Pages and other static deployments). The option is in the `prerender` block, not the top-level Nitro config, and the syntax `server.prerender.autoSubfolderIndex` is valid in `defineConfig`.

**Caveat — dev server:** The Vinxi dev server (`npm run dev`) uses a real HTTP server that handles clean URLs. `autoSubfolderIndex: false` only affects prerender output. Dev and preview behavior are decoupled; the `.html` extension only appears in final built output. This is correct and expected.

**Caveat — root route:** The root `/` route and the `/reference` route will still produce `index.html` and `reference/index.html` because these are not affected by `autoSubfolderIndex`. Only non-root routes with path segments are flattened.

---

### Why Not a Post-Processing Step Instead?

An alternative is a Node.js post-build script that walks `.output/public/` and renames `*/index.html` to `*.html`. This works but:
- Adds fragile file renaming logic that must be maintained separately
- Requires special handling for already-flat files and the root index
- Requires the script to also update all internal `href` references in HTML files (or they break)

The `autoSubfolderIndex: false` approach is cleaner because Nitro handles both the file placement and the internal link generation consistently. **Use `autoSubfolderIndex: false`.**

---

## 3. Content-Derived Titles (First H1 Extraction)

### The Problem

`scanDocsFolder` in `/Users/tomasstrejcek/Dev/yolodocs/src/markdown/loader.ts` sets `title` from `frontmatter.title` with a filename fallback. The first H1 heading in the markdown body (`# Getting Started`) is the most natural source of truth but is not consulted.

Additionally, `MarkdownPage` always renders `<h1>{props.title}</h1>` above the body. If the body starts with `# Getting Started`, a duplicate heading appears.

### Approach: Regex Extraction at Scan Time

Extract the first H1 at `scanDocsFolder` time. This is the right place — it runs once during CLI build, not in the browser, so performance is irrelevant and no additional runtime dependency is needed.

**Regex:**

```ts
function extractFirstH1(markdownBody: string): string | null {
  const match = markdownBody.match(/^#\s+(.+)/m);
  return match ? match[1].trim() : null;
}
```

The `/m` flag makes `^` match the start of any line, not just the string start. This handles markdown where the H1 is not literally the first character (e.g., preceded by blank lines).

**Title priority in `scanDocsFolder`:**

```ts
const h1Title = extractFirstH1(body);
const title =
  (frontmatter.title as string) ||   // 1. explicit frontmatter
  h1Title ||                          // 2. first H1 in body
  path.basename(entry.name, path.extname(entry.name));  // 3. filename
```

This order is intentional: frontmatter is explicit author intent and should override body content. First H1 is preferred over filename because content is authoritative.

**Suppressing redundant heading in `MarkdownPage`:**

`MarkdownPage` must not render the `<h1>` if the markdown body already starts with one. The cleanest approach is a `showTitle` prop:

```tsx
export function MarkdownPage(props: { content: string; title: string; showTitle?: boolean }) {
  // showTitle defaults to true for backward compat; caller passes false when body has H1
}
```

In `DocsPage` (the route), check whether the resolved page has an H1 and pass `showTitle={false}` accordingly. Or simpler: strip the leading H1 from the body before rendering and always show the title from props — this keeps MarkdownPage's behavior predictable.

**Preferred approach — strip leading H1 from body:**

```ts
function stripLeadingH1(body: string): string {
  return body.replace(/^#\s+.+\n?/m, "").trimStart();
}
```

Store the original body in the content file, strip in the page component. This way `MarkdownPage` always renders its `title` prop as `<h1>` and the body never double-renders a heading. Cleaner than a conditional `showTitle` prop because it avoids API surface.

**Confidence: High.** This is a simple string operation. The regex is standard and matches how every other doc tool (Docusaurus, VitePress, Starlight) extracts page titles from content. No dependency needed.

---

## 4. Data Model Changes Required

The current `NavigationItem` type already supports recursive `children?: NavigationItem[]`. The `DocsPage` type does not need changes. What changes:

**`buildNavigationManifest` in `src/cli/build.ts`:**

Currently groups by `slug.slice(0, slashIdx)` (first segment only). Needs to parse up to two segments:

```
product/auth/oauth.md → folder1="product", folder2="auth", file="oauth"
product/intro.md      → folder1="product", folder2=null,   file="intro"
getting-started.md    → folder1=null,      folder2=null,   file="getting-started"
```

Build a two-level map: `Map<string, Map<string, Page[]>>` then convert to `NavigationSection[]` with nested `NavigationItem[]`.

**Anchor values in manifest:**

Change from `${base}/docs/${slug}` to `${base}/docs/${slug}.html` to match flat file output.

**`Sidebar.tsx` active ID derivation:**

`derivedActiveId` currently strips `withBase("/docs/")` prefix from pathname. With flat HTML, pathname will be `/docs/architecture.html`. The slug extraction must strip the `.html` suffix: `slug = pathname.slice(docsPrefix.length).replace(/\.html$/, "")`.

---

## 5. What Is Not Needed

- **No new npm packages** — recursive SolidJS components use only existing `For`, `Show`, `createSignal` from `solid-js`.
- **No new CLI options** — flat HTML is a permanent architectural decision (see PROJECT.md), not a toggle.
- **No changes to Vinxi config** beyond `app.config.ts` — `autoSubfolderIndex` is a prerender option, not a Vite option.
- **No server-side changes** — all changes are in the CLI build pipeline, the static site template, and the prerender config.
- **No changes to gray-matter usage** — frontmatter parsing stays as-is; only the fallback chain changes.

---

## Decision Summary

| Problem | Recommended Approach | Confidence |
|---------|---------------------|------------|
| 3-level sidebar rendering | Recursive `SidebarNavNode` component using `For` + `Show`, self-calls for `children` | High |
| Auto-expand active group | `hasActiveDescendant()` helper; initialize `collapsed` signal from it | High |
| Flat HTML output | `autoSubfolderIndex: false` in `server.prerender` in `app.config.ts` | High |
| Sidebar anchor hrefs | Add `.html` suffix to all docs anchor values in `buildNavigationManifest` | High |
| Active state with `.html` URLs | Strip `.html` from pathname before comparing to derived ID | High |
| Title from H1 | Regex `/^#\s+(.+)/m` at `scanDocsFolder` scan time; priority: frontmatter → H1 → filename | High |
| Suppress duplicate heading | Strip leading H1 from body before passing to `MarkdownPage` | High |

---

## What Other Tools Do vs. What Yolodocs Should Do

| Concern | Docusaurus | VitePress | Starlight | Yolodocs (recommended) |
|---------|-----------|-----------|-----------|----------------------|
| Sidebar depth | Unlimited (practical limit: 6) | Up to 6 levels | Unlimited via autogenerate | 3 levels (capped, by design) |
| Recursive rendering | React component calls itself | Vue component calls itself | Astro component calls itself | SolidJS component calls itself |
| Title source | frontmatter `title`, then H1, then filename | frontmatter `title`, then H1 | frontmatter `title`, then first H1 | frontmatter → H1 → filename |
| Flat HTML output | `index.html` by default; Docusaurus does not support flat `.html` natively | `index.html` by default | `index.html` by default | `autoSubfolderIndex: false` → `.html` |
| Static hosting compat | Requires URL rewriting or trailing-slash redirect | Same as Docusaurus | Same | No URL rewriting needed — `.html` works on any file host |
| Folder label | `_category_.json` label field or title-cased dir name | Config or plugin | Title-cased dir name, configurable | Title-cased dir name (existing transform) |

**Rationale for flat HTML vs. directory/index.html:** Every other major doc tool relies on clean-URL resolution (e.g., nginx, Vercel, Netlify, Cloudflare Pages redirect `docs/architecture` to `docs/architecture/index.html`). GCS and S3 without a CDN front-end do not. The yolodocs deployment target is GCS directly. Flat `.html` files are the only solution that works universally without host-specific configuration. This is not a limitation of SolidStart — it is a deliberate output format choice for portability.

---

*Research date: 2026-02-20*

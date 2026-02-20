# Phase 1: Data Layer - Research

**Researched:** 2026-02-20
**Domain:** Node.js filesystem scanning, manifest building, slug normalization, TypeScript build pipeline
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-01 | `buildNavigationManifest` parses two levels of path segments for 3-level hierarchy | Current function only splits on first `/` (one level). Must be refactored to a 2-level map: top-level folder → section, second-level folder → group, leaf file → item. Code pattern documented below. |
| DATA-02 | `scanDocsFolder` extracts first H1 from markdown body as title source | Currently only uses `frontmatter.title` with filename fallback. Regex extraction at scan time is the correct approach. Pattern: `/^#\s+(.+)/m` on raw `body` string. |
| DATA-03 | Docs manifest correctly handles nested slug paths (e.g., `product/guides/filtering`) | `scanDir` already produces multi-segment slugs via `path.relative`. The manifest builder must consume these without truncating the second segment. File-writing (`docs-pages/{slug}.js`) already uses `fse.ensureDirSync` and handles nested paths. The gap is in `buildNavigationManifest` grouping logic. |
| DATA-04 | No slug collisions between files and folders at the same level | Not currently checked. `developer/api.md` and `developer/api/intro.md` silently produce conflicting manifest entries. Must add a build-time assertion after `scanDir` completes that detects basename conflicts within each directory level. |
| NAV-03 | Folder group labels are title-cased from directory names (e.g., `developer-reference/` → "Developer Reference") | Already implemented in current `buildNavigationManifest` for one level via `folder.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())`. Must apply same transform to second-level folder names. |
| NAV-06 | Top-level docs folders become separate sidebar sections (e.g., `docs/product/` → "Product Docs" section) | Currently all docs collapse into a single `"docs"` section. Must treat each unique first-segment folder as its own `NavigationSection`. Root-level files (no folder) need a dedicated section (e.g., "Documentation"). |
| TITL-01 | Menu item label is derived from first H1 header in markdown content, not filename | Not yet implemented. Regex extraction at `scanDir` scan time; stored on `DocsPage`; consumed in manifest builder as second priority. |
| TITL-02 | Frontmatter `title` takes priority over H1 when explicitly set; filename is last fallback | Title priority chain: `frontmatter.title` → H1 from body → `path.basename(filename, ext)`. Currently missing middle step. |
</phase_requirements>

---

## Summary

Phase 1 targets two files exclusively: `src/markdown/loader.ts` and `src/cli/build.ts`. These are pure Node.js/TypeScript with no external API dependencies. No new npm packages are required.

The current `scanDocsFolder` in `loader.ts` already performs recursive directory scanning and produces multi-segment slugs (e.g., `product/guides/filtering`). The gap is twofold: (1) it does not extract the first H1 from the markdown body as a title source, and (2) there is no collision detection between same-basename files and directories. Both are small, isolated additions to `scanDir`.

The current `buildNavigationManifest` in `build.ts` only splits on the first `/` of each slug, so all docs collapse into a single `"docs"` section with at most one level of folder grouping. The refactor must parse up to two segments: the first segment determines which `NavigationSection` a page belongs to (NAV-06), the second segment (if present) determines which collapsible group it falls into (DATA-01), and the leaf file populates the group's children. Pages with no folder segment remain in a root-level "Documentation" section. The existing `NavigationItem.children?: NavigationItem[]` type is already recursive and requires no changes.

The sort ordering must be defined clearly: within a section, groups sort by folder name alphabetically (no frontmatter for folders); within a group or the root level, pages sort by `order` then `title`, matching the existing comparator. The legacy `category` frontmatter field should be ignored for folder-based pages to avoid P12 (mixed-sort inconsistency) while remaining harmless for backward compat.

**Primary recommendation:** Implement DATA-02 (H1 extraction) first in `loader.ts` — it is purely additive. Then refactor `buildNavigationManifest` in `build.ts` to consume the new title field and restructure the grouping logic for NAV-06 and DATA-01. Add the DATA-04 collision assertion as a guard inside `scanDocsFolder` after the scan completes.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:fs` | built-in | File reading in `scanDir` | Already used; no alternative needed |
| `node:path` | built-in | `path.relative`, `path.basename`, `path.extname` | Already used throughout |
| `gray-matter` | ^4 (already installed) | Frontmatter parsing | Already used in `loader.ts`; parses `{ data, content }` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `fs-extra` | ^11 (already installed) | `fse.ensureDirSync` for nested `docs-pages/` writes | Already used in `build.ts` for directory creation |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Regex `/^#\s+(.+)/m` for H1 | `marked` AST to find token with `type === "heading"` and `depth === 1` | Regex is simpler, zero-dependency, and matches how Docusaurus/VitePress/Starlight do it at scan time. `marked` parse is heavier and unnecessary at this stage since full rendering happens later. |
| Build-time slug uniqueness assertion | Runtime check in site component | Build-time is strictly better — fails fast before prerender, gives descriptive error, no user-visible failure. |

**Installation:**
No new packages required. All needed libraries are already in `package.json`.

---

## Architecture Patterns

### Recommended Project Structure

No new files or directories. Changes are isolated to:

```
src/
├── markdown/
│   └── loader.ts          # Add H1 extraction, slug normalization, collision detection
├── cli/
│   └── build.ts           # Refactor buildNavigationManifest for 3-level hierarchy + section split
└── schema/
    └── types.ts           # Add h1Title field to DocsPage (optional but cleaner)
```

### Pattern 1: H1 Extraction via Regex in `scanDir`

**What:** Extract the first H1 from the raw markdown body at scan time using a single-pass regex. Store result on `DocsPage`. Use it as the second priority in the title chain.

**When to use:** Any time a doc page's title should be content-derived rather than filename-derived.

**Example:**
```typescript
// In scanDir(), after gray-matter parse:
function extractFirstH1(body: string): string | null {
  const match = body.match(/^#\s+(.+)/m);
  return match ? match[1].trim() : null;
}

const h1Title = extractFirstH1(body);

pages.push({
  slug,
  title:
    (frontmatter.title as string) ||
    h1Title ||
    path.basename(entry.name, path.extname(entry.name)),
  category: (frontmatter.category as string) || "General",
  order: (frontmatter.order as number) || 999,
  content: body,
});
```

The `/m` flag is required — `^` must match the start of any line, not just the string start, because a file may begin with blank lines or frontmatter-stripped preamble.

**Inline markup caution (P4):** If a title like `**Bold Auth**` or `` `createUser` Mutation`` is captured, the string contains raw markdown syntax. At the data layer (Phase 1) this is fine — the sidebar renders it as text, so backticks appear as literal characters. Phase 3 (sidebar rendering) or Phase 4 (MarkdownPage) can strip inline markdown if needed. Do not add a second parse pass here.

### Pattern 2: 3-Level Manifest Grouping in `buildNavigationManifest`

**What:** Parse up to two path segments from each slug to determine section membership (first segment) and group membership (second segment).

**When to use:** Any slug from the docs scanner that contains folder separators.

**Key insight — slug segment parsing:**
```typescript
// Decompose slug into up to 3 parts
// "product/guides/filtering" → section="product", group="guides", leaf="filtering"
// "product/billing"          → section="product", group=null, leaf="billing"
// "getting-started"          → section=null,      group=null, leaf="getting-started"

function parseSlugSegments(slug: string): {
  section: string | null;
  group: string | null;
  leaf: string;
} {
  const parts = slug.split("/");
  if (parts.length === 1) return { section: null, group: null, leaf: parts[0] };
  if (parts.length === 2) return { section: parts[0], group: null, leaf: parts[1] };
  // For 3+ segments: section=parts[0], group=parts[1], leaf=parts.slice(2).join("/")
  // The leaf retains any deeper segments as a single key (consistent with slug-based routing)
  return { section: parts[0], group: parts[1], leaf: parts.slice(2).join("/") };
}
```

**Data structure to build before emitting NavigationSection[]:**
```typescript
// sectionMap: section name → groupMap
// groupMap: group name (or "" for ungrouped) → DocsPage[]
const sectionMap = new Map<string, Map<string, typeof docsManifest.pages>>();
const rootPages: typeof docsManifest.pages = []; // no folder at all
```

**Section label derivation (NAV-06 + NAV-03):**
```typescript
// All top-level folders become independent sections
// Root-level files go into a generic "Documentation" section

function toTitleCase(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Section for "product/" → id: "docs-product", title: "Product Documentation"
// Or simpler — just title-case it: "Product"
// DECISION: title-case + " Docs" suffix vs just title-case
// Recommendation: pure title-case (no suffix) to keep labels concise
```

**Emit order:**
1. Root pages section ("Documentation") — if any root-level pages exist
2. One section per top-level folder, sorted by folder name alphabetically
3. Within each section: ungrouped pages first (sorted by order/title), then groups sorted by folder name alphabetically, with pages inside each group sorted by order/title

### Pattern 3: Slug Collision Detection (DATA-04)

**What:** After `scanDir` completes, assert that no two slugs share a prefix that would cause file/folder ambiguity. Specifically: if `developer/api` appears as a slug and `developer/api/intro` also appears, that is a collision.

**When to use:** At the end of `scanDocsFolder`, before returning the manifest.

**Example:**
```typescript
function assertNoSlugCollisions(pages: DocsPage[]): void {
  const slugSet = new Set(pages.map((p) => p.slug));
  for (const slug of slugSet) {
    const parts = slug.split("/");
    // Check all prefix paths: if "developer/api" exists AND "developer/api/..." exists → collision
    for (let i = 1; i < parts.length; i++) {
      const prefix = parts.slice(0, i).join("/");
      if (slugSet.has(prefix)) {
        throw new Error(
          `Slug collision detected: "${prefix}" exists as both a file and a parent path of "${slug}". ` +
          `Rename either the file "${prefix}.md" or the directory "${prefix}/" to avoid ambiguity.`
        );
      }
    }
  }
}
```

Call at the end of `scanDocsFolder` before the sort step:
```typescript
assertNoSlugCollisions(pages);
pages.sort(...);
return { pages };
```

### Pattern 4: Slug Normalization (P10 prevention)

**What:** Normalize slugs immediately after construction to prevent double-slash or trailing-slash issues.

**When to use:** In `scanDir` after computing the slug from `path.relative`.

**Example:**
```typescript
const slug = relativePath
  .replace(/\.(md|mdx)$/, "")
  .replace(/\\/g, "/")           // Windows path sep normalization
  .replace(/\/+/g, "/")          // Collapse double slashes
  .replace(/^\/|\/$/g, "");      // Strip leading/trailing slashes
```

The current code only handles backslash replacement. The additional normalizations are defensive.

### Anti-Patterns to Avoid

- **Splitting on more than two levels:** Requirements cap at 3-level hierarchy (section → group → leaf). Slugs with 4+ segments should be treated as deeper leaves within the deepest group. Do not recurse further in the manifest builder.
- **Using `category` frontmatter for folder-based grouping:** The `category` field is only meaningful for root-level pages without a folder structure. Folder-based pages use their directory path as the canonical group. Reading `category` from folder-based pages in the manifest builder would produce P12 (mixed sort inconsistency). Ignore it in `buildNavigationManifest` for pages with folder slugs.
- **Storing inline markdown in title:** The H1 regex captures raw markdown. Do not run it through `marked` at scan time. Store the raw captured text; downstream rendering can strip markup if needed.
- **Mutating `NavigationItem` type:** `children?: NavigationItem[]` is already defined in `types.ts`. No changes needed to accommodate 3-level data. Do not add new type fields unless strictly necessary.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Frontmatter parsing | Custom YAML/TOML parser | `gray-matter` (already used) | Handles edge cases: multi-line values, YAML special chars, BOM, etc. |
| Recursive directory scan | `glob` package or manual `readdirSync` depth tracking | `scanDir` already in `loader.ts` works correctly | It is already written and tested; extend, don't replace |
| Slug uniqueness | Bring in a path-resolution library | Simple `Set` + prefix iteration (see Pattern 3) | The collision check is a single O(n·d) pass where d is max depth |

**Key insight:** Phase 1 is pure data transformation with no UI, no network, and no external services. Every problem in scope can be solved with built-in Node.js APIs and the already-present `gray-matter` library.

---

## Common Pitfalls

### Pitfall 1: H1 With Inline Markdown Renders as Raw Syntax in Sidebar (P4)

**What goes wrong:** A heading like `# \`createUser\` Mutation` produces the raw string `` `createUser` Mutation `` in the sidebar label. Backticks appear as literal characters.

**Why it happens:** The regex captures the raw markdown source, not the rendered text.

**How to avoid:** Accept this behavior in Phase 1. The sidebar will render it as text (backticks visible). Phase 3 (sidebar component) or Phase 4 (MarkdownPage) can strip inline markdown from the captured title if needed. Do not add a `marked` parse pass to `scanDir` — that belongs at render time.

**Warning signs:** A sidebar item shows `` `createUser` Mutation `` instead of `createUser Mutation`.

### Pitfall 2: Slug Collision Silently Corrupts Content Loading (P1)

**What goes wrong:** `developer/api.md` (slug: `developer/api`) and `developer/api/intro.md` (slug: `developer/api/intro`) both exist. The route `/docs/developer/api` matches both the file page and the parent path of the nested page. The glob key lookup in `[...path].tsx` returns content from `api.md` when `/docs/developer/api/intro` is requested, or returns nothing.

**Why it happens:** No collision check currently exists in `scanDocsFolder`. Slugs are generated independently from filesystem paths without cross-checking.

**How to avoid:** Add `assertNoSlugCollisions(pages)` as documented in Pattern 3, called before the sort in `scanDocsFolder`. The error message must name both conflicting slugs.

**Warning signs:** One doc page renders content from a completely different page. Content appears correct in some test runs but wrong in others depending on sort order.

### Pitfall 3: `buildNavigationManifest` Truncates Group-Level Children (P5 precursor)

**What goes wrong:** If the refactored `buildNavigationManifest` emits `NavigationItem` children correctly for 2-level slugs (section → group → leaf) but the legacy `SidebarSubGroup` component in the site template is not yet updated, those third-level items are silently dropped from the rendered sidebar with no TypeScript error.

**Why it happens:** Phase 1 produces correct data but Phase 3 (sidebar) is not yet deployed. The mismatch is invisible at the data layer.

**How to avoid:** This is an expected intermediate state. The manifest should still be correct. Phase 3 (sidebar) will consume the correct data. The integration test (end-to-end build) can verify the manifest JSON is correct before Phase 3 is started, even if the rendered sidebar doesn't show the third level yet.

**Warning signs:** `manifest.json` contains `children[].children[]` entries but the built sidebar DOM has no corresponding `<a>` elements.

### Pitfall 4: Section Ordering Inconsistency When Root Pages and Folder Pages Coexist (P12)

**What goes wrong:** If a `docs/` folder contains both `getting-started.md` (root-level, no folder) and `product/auth/oauth.md` (3-level path), the manifest must place the root-level page in a sensible section. If root pages are placed after folder sections, or mixed with them unpredictably, the sidebar reads strangely.

**Why it happens:** No explicit ordering rule is documented for the mixed case.

**How to avoid:** Define and implement a fixed rule: root-level pages always appear first in a "Documentation" section (or collapsed into the first section if there is only one). Folder sections follow, sorted alphabetically by folder name. Document this rule in the code with a comment.

**Warning signs:** Each build produces a different sidebar ordering when both root and folder docs exist.

### Pitfall 5: `DocsPage.category` Sort Breaks Folder-Based Pages (P12)

**What goes wrong:** `scanDocsFolder` currently sorts by `a.category.localeCompare(b.category)` first. For folder-based pages, `category` defaults to `"General"` (the frontmatter fallback). All pages with a folder slug land in `"General"` and sort together by order/title rather than by their folder grouping. The manifest builder then receives a flat, unsorted-by-folder list.

**Why it happens:** The sort in `scanDocsFolder` was designed for a 1-level `category`-based grouping, not folder-based grouping.

**How to avoid:** The `buildNavigationManifest` function re-sorts pages within each group by `order` then `title`. The top-level sort in `scanDocsFolder` can remain as-is for backward compatibility — the manifest builder groups by slug segments regardless of the array order it receives. The category sort is harmless but misleading; consider removing category-based sorting from `scanDocsFolder` or replacing it with slug-based sorting in a follow-on cleanup.

---

## Code Examples

Verified patterns from the existing codebase:

### Current `loader.ts` — Entry Point for Changes

```typescript
// src/markdown/loader.ts (current state, abridged)
export function scanDocsFolder(docsDir: string): DocsManifest {
  const pages: DocsPage[] = [];
  if (!fs.existsSync(docsDir)) return { pages };
  scanDir(docsDir, docsDir, pages);
  pages.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    if (a.order !== b.order) return a.order - b.order;
    return a.title.localeCompare(b.title);
  });
  return { pages };
}

function scanDir(baseDir: string, currentDir: string, pages: DocsPage[]): void {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      scanDir(baseDir, fullPath, pages);
    } else if (entry.name.endsWith(".md") || entry.name.endsWith(".mdx")) {
      const content = fs.readFileSync(fullPath, "utf-8");
      const { data: frontmatter, content: body } = matter(content);
      const relativePath = path.relative(baseDir, fullPath);
      const slug = relativePath.replace(/\.(md|mdx)$/, "").replace(/\\/g, "/");
      pages.push({
        slug,
        title: (frontmatter.title as string) || path.basename(entry.name, path.extname(entry.name)),
        category: (frontmatter.category as string) || "General",
        order: (frontmatter.order as number) || 999,
        content: body,
      });
    }
  }
}
```

**Changes needed in `loader.ts`:**
1. Add `extractFirstH1(body)` call after `matter(content)` parse
2. Change title assignment to 3-way priority: `frontmatter.title || h1Title || filename`
3. Add slug normalization (double-slash collapse)
4. Call `assertNoSlugCollisions(pages)` before sort in `scanDocsFolder`
5. Consider adding `h1Title?: string` to `DocsPage` in `types.ts` for transparency (optional — only matters if callers need to distinguish H1 from other title sources)

### Current `buildNavigationManifest` — Grouping Logic to Replace

```typescript
// Current behavior (build.ts lines 252-313):
// Only splits on first "/" — all docs → single "docs" section
const slashIdx = page.slug.indexOf("/");
if (slashIdx === -1) {
  rootPages.push(page);
} else {
  const folder = page.slug.slice(0, slashIdx);  // Only first segment
  const group = folderMap.get(folder) || [];
  group.push(page);
  folderMap.set(folder, group);
}
// ... emits a single section with id: "docs"
sections.push({ id: "docs", title: "Documentation", items });
```

**Replace with a 2-level grouping approach:**
```typescript
// sectionMap: first-segment folder → { ungrouped: pages[], groups: Map<string, pages[]> }
// root pages (no folder) → their own "Documentation" section

type GroupData = {
  ungrouped: typeof docsManifest.pages;
  groups: Map<string, typeof docsManifest.pages>;
};

const sectionMap = new Map<string, GroupData>();
const rootPages: typeof docsManifest.pages = [];

for (const page of docsManifest.pages) {
  const parts = page.slug.split("/");
  if (parts.length === 1) {
    rootPages.push(page);
  } else if (parts.length === 2) {
    const [section, _leaf] = parts;
    if (!sectionMap.has(section)) sectionMap.set(section, { ungrouped: [], groups: new Map() });
    sectionMap.get(section)!.ungrouped.push(page);
  } else {
    // 3+ segments: parts[0]=section, parts[1]=group, rest=leaf
    const [section, group] = parts;
    if (!sectionMap.has(section)) sectionMap.set(section, { ungrouped: [], groups: new Map() });
    const sectionData = sectionMap.get(section)!;
    if (!sectionData.groups.has(group)) sectionData.groups.set(group, []);
    sectionData.groups.get(group)!.push(page);
  }
}
```

### Existing `buildNavigationManifest` — Folder Label Pattern (to reuse)

```typescript
// Already in build.ts — this exact transform covers NAV-03 for both section and group labels:
const folderLabel = folder
  .replace(/-/g, " ")
  .replace(/\b\w/g, (c) => c.toUpperCase());

// "developer-reference" → "Developer Reference"
// "product"             → "Product"
// "auth"                → "Auth"
```

This can be extracted into a shared helper `toTitleCase(slug: string): string` to avoid repetition across section and group label generation.

### `types.ts` — No Changes Required to `NavigationItem`

```typescript
// Already supports arbitrary depth via recursive children:
export interface NavigationItem {
  id: string;
  name: string;
  anchor: string;
  description: string;
  children?: NavigationItem[];  // Already recursive — no change needed
}
```

**Potential addition to `DocsPage` (optional):**
```typescript
export interface DocsPage {
  slug: string;
  title: string;
  category: string;
  order: number;
  content: string;
  // h1Title?: string;  // Optional: only needed if callers must distinguish title source
}
```

Adding `h1Title` is LOW value for Phase 1 — the resolved `title` field already captures the correct value. Skip unless a downstream consumer needs to know the source.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single flat "docs" section | Multiple sections by top-level folder | Phase 1 (this phase) | NAV-06: Product/Developer docs split |
| Filename-only title fallback | frontmatter → H1 → filename | Phase 1 (this phase) | TITL-01, TITL-02: Content-derived labels |
| No collision check | Build-time slug assertion | Phase 1 (this phase) | DATA-04: Fail fast before prerender |
| 1-level manifest grouping | 2-level (section + group) | Phase 1 (this phase) | DATA-01: True 3-level hierarchy data |

**Deprecated/outdated:**
- `category` frontmatter field: Still parsed and stored but no longer used for navigation grouping for folder-based pages. Not removed (backward compat) but effectively deprecated for the nav manifest. Document in README or code comment.

---

## Open Questions

1. **Root-level page section label**
   - What we know: Root-level pages (no folder) need a section. The current code uses `"Documentation"`.
   - What's unclear: Should the label be "Documentation", "General", or match the `--title` CLI option?
   - Recommendation: Use `"Documentation"` as a fixed label. It is clear, doesn't conflict with schema sections, and the existing section title "Documentation" is already established in the current codebase.

2. **Ordering of sections: root-pages first or folders first?**
   - What we know: Current code puts docs before schema sections, and root pages before folder groups within docs.
   - What's unclear: When multiple top-level folders exist (e.g., `product/` and `developer/`), which appears first in the sidebar?
   - Recommendation: Alphabetical folder order (existing `sortedFolders = [...folderMap.keys()].sort()`). Root pages section always first among docs sections.

3. **Section ID format for folder sections**
   - What we know: Current section ID is `"docs"`. With multiple sections, each needs a unique ID.
   - What's unclear: Should it be `"docs-product"` or just `"product"`?
   - Recommendation: Use `"docs-${folder}"` (e.g., `"docs-product"`, `"docs-developer"`) to namespace docs sections separately from schema sections. Root section: `"docs"`. This preserves existing sidebar component matching logic.

4. **What happens with 4-level deep slug paths (e.g., `a/b/c/d.md`)?**
   - What we know: Requirements cap at 3 levels. The `Out of Scope` section explicitly states "Unlimited nesting depth — beyond 3 levels, sidebars become unusable".
   - What's unclear: Should a 4th-level slug cause a build error, or be silently flattened into the 3rd-level group?
   - Recommendation: Flatten silently — treat `a/b/c/d.md` as section=`a`, group=`b`, leaf=`c/d`. The leaf slug remains the full path for routing, but the manifest groups it under the second-level folder. This is the simplest behavior with no user-visible error for a rare edge case.

---

## Implementation Checklist (for Planner)

Phase 1 touches exactly two source files. The work is:

**`src/markdown/loader.ts`:**
- [ ] Add `extractFirstH1(body: string): string | null` helper function
- [ ] Update title assignment to 3-way priority chain
- [ ] Add slug normalization (collapse double slashes, strip trailing slash)
- [ ] Add `assertNoSlugCollisions(pages: DocsPage[]): void` helper
- [ ] Call `assertNoSlugCollisions` before the sort in `scanDocsFolder`

**`src/cli/build.ts`:**
- [ ] Extract `toTitleCase(s: string): string` helper
- [ ] Replace single-level grouping loop with 2-level `sectionMap` approach
- [ ] Emit one `NavigationSection` per top-level folder (NAV-06)
- [ ] Emit root-level pages as a separate "Documentation" section (when present)
- [ ] Apply `toTitleCase` to both section names and group names (NAV-03)
- [ ] Sort sections: root section first, then folder sections alphabetically
- [ ] Sort groups within each section: ungrouped pages (by order/title) then groups alphabetically, pages within groups by order/title

**Tests (`src/cli/build.test.ts` or new `src/markdown/loader.test.ts`):**
- [ ] H1 extraction: plain, inline code, bold, missing H1
- [ ] Title priority: frontmatter wins over H1, H1 wins over filename
- [ ] Slug normalization: double slashes, backslashes, trailing slashes
- [ ] Collision detection: file and folder with same basename throws
- [ ] Manifest structure: 3-level slug produces correct section/group/item nesting
- [ ] NAV-03: folder labels are title-cased correctly
- [ ] NAV-06: multiple top-level folders produce separate sections

---

## Sources

### Primary (HIGH confidence)

- Direct inspection of `/Users/tomasstrejcek/Dev/yolodocs/src/markdown/loader.ts` — current `scanDir` and `scanDocsFolder` implementation
- Direct inspection of `/Users/tomasstrejcek/Dev/yolodocs/src/cli/build.ts` — current `buildNavigationManifest` implementation (lines 243–435)
- Direct inspection of `/Users/tomasstrejcek/Dev/yolodocs/src/schema/types.ts` — `NavigationItem`, `DocsPage`, `NavigationSection` interfaces
- `.planning/research/SUMMARY.md` — domain research confirming approach and pitfalls
- `.planning/research/STACK.md` — confirmed H1 regex approach and title priority chain
- `.planning/research/ARCHITECTURE.md` — confirmed component boundaries and data flow
- `.planning/research/PITFALLS.md` — P1, P4, P10, P12 directly addressed in this phase

### Secondary (MEDIUM confidence)

- `.planning/codebase/ARCHITECTURE.md`, `STRUCTURE.md`, `CONVENTIONS.md` — codebase conventions confirmed by code inspection
- Docusaurus, VitePress, Starlight pattern references (from STACK.md/SUMMARY.md) — confirm `/^#\s+(.+)/m` regex is the standard approach for H1 title extraction

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all solutions use existing APIs directly confirmed in source
- Architecture: HIGH — changes are isolated to two files with clear before/after state documented from code inspection
- Pitfalls: HIGH — pitfalls documented from the pre-existing PITFALLS.md research plus direct code inspection of the current implementation

**Research date:** 2026-02-20
**Valid until:** 2026-04-20 (stable Node.js/TypeScript patterns; no external API dependencies)

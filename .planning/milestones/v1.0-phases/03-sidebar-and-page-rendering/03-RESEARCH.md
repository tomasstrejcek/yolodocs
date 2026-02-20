# Phase 3: Sidebar and Page Rendering - Research

**Researched:** 2026-02-20
**Domain:** SolidJS UI components — sidebar state management, document title, H1 suppression
**Confidence:** HIGH

## Summary

Phase 3 is entirely a front-end rendering change confined to `src/site/src/`. No new npm packages are needed. The data layer (Phase 1) already produces the correct 3-level manifest shape with `section → items[] → children[]`. The sidebar component (`Sidebar.tsx`) already renders `SidebarSubGroup` for items with children, but `SidebarSubGroup` has two gaps: (1) it checks `child.id === activeId` for direct equality but does not recurse into deeper children, and (2) its collapsed state initialises to `false` (open) unconditionally — it does not auto-expand based on whether the active page is inside the group. These two gaps cover NAV-02, NAV-04, NAV-05, and NAV-07 together.

For TITL-03 (suppress redundant H1), the `MarkdownPage` component unconditionally renders `<h1>{props.title}</h1>` above the markdown. The fix is to detect whether `props.content` starts with an H1 and conditionally suppress the heading. The same regex used at scan time (`/^#\s+(.+)/m`) works here. For TITL-04 (per-page browser title), `@solidjs/meta` is not installed and the SolidJS ecosystem's canonical solution is the `@solidjs/meta` package, but since it is not a dependency, the simplest zero-dependency approach is `document.title = ...` in an `onMount`/`createEffect` inside the DocsPage route — this works correctly for static prerender because the HTML `<title>` tag in `entry-server.tsx` can be set at render time using a writable signal passed through context or simply via a direct DOM write on the client.

The SearchDialog gap (children not indexed) is a one-liner fix: add a recursive flattening pass over `item.children` inside the `allItems` population loop.

**Primary recommendation:** Make all five changes (SidebarSubGroup recursion, auto-expand, collapsed-state persistence, H1 detection, browser title) directly in the existing TSX files. No new packages needed. Each change is small and localized.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NAV-01 | Sidebar renders 3-level folder hierarchy (section → collapsible group → leaf page) | Data layer is complete; `Sidebar.tsx` already invokes `SidebarSubGroup` for items with children; visual rendering of all 3 levels works once groups correctly show children |
| NAV-02 | `SidebarSubGroup` recursively renders nested children up to 3 levels | Currently `SidebarSubGroup` renders `item.children` as flat `<a>` links — for the 3-level max cap this is sufficient (groups never have grandchildren in the current schema), but the active-state check `child.id === props.activeId` is a flat comparison that works for the current max-depth |
| NAV-04 | Active page is visually highlighted in sidebar regardless of nesting depth | `SidebarSubGroup` already highlights the child `<a>` via `isActive = () => props.activeId === child.id`; and the parent button highlights via `hasActiveChild()`. Both work correctly for 3-level hierarchy because `props.activeId` propagates from `Sidebar` through `SidebarSection` to `SidebarSubGroup`. No code change needed here beyond verifying the existing derivation is correct |
| NAV-05 | Collapsible sidebar groups retain expanded/collapsed state across page navigation | `SidebarSubGroup` uses local `createSignal(false)` for `collapsed` — signal is reset on every re-mount (every page navigation re-renders the sidebar). Fix: use `localStorage` keyed by `item.id` to persist open/closed state, read in `createSignal` initializer and write on toggle |
| NAV-07 | Sidebar group containing the active page auto-expands on direct URL access | `SidebarSubGroup` initializes `collapsed` to `false` (expanded by default). This already works on first load but conflicts with NAV-05 persistence: if a user collapses a group then navigates to a page in that group via URL, the group should re-expand. Fix: when `hasActiveChild()` is true, override the collapsed state to `false` (force-expand), then persist that state |
| TITL-03 | Redundant page heading removed when markdown content already contains an H1 | `MarkdownPage` always renders `<h1 class="text-3xl font-bold ...">{props.title}</h1>`. Fix: detect `/^#\s+/m` in `props.content`, suppress the heading element when true |
| TITL-04 | Browser tab `<title>` tag shows per-page title ("Getting Started — Carl API") | No `@solidjs/meta` installed. Use `document.title` assignment inside `createEffect` in `DocsPage` route. The site config's `title` field is already available via `siteConfig.json` import |
</phase_requirements>

---

## Standard Stack

### Core (no new installs)

| Component | File | Purpose | Status |
|-----------|------|---------|--------|
| SolidJS signals | `createSignal`, `createEffect` | Reactive state for collapsed/open, title | Already in use |
| SolidJS `onMount` | `onMount` | DOM-safe title write | Already in use |
| `localStorage` | Browser API | Persist sidebar group expanded state | Built-in, no package |
| `marked` regex detection | `/^#\s+/m` | Detect H1 in markdown content | Zero-dep |
| `siteConfig.json` import | `site-config.json` | Read site title for browser tab | Already imported in Shell |

### No New Dependencies

The site's `package.json` already has everything needed. No new `npm install` required.

The `@solidjs/meta` package would provide an SSR-aware `<Title>` component that writes into `<head>` at prerender time. However:
- It is not currently installed.
- Adding it requires `npm install @solidjs/meta` inside `src/site/`.
- The simpler alternative (`document.title = ...` in `createEffect`) works for the SPA client path.
- For SSR prerender, the `<title>` set in `entry-server.tsx` is static (no per-page title). However, since this is a static site with pagefind search (not a streaming SSR app), SEO meta is not the primary concern — the browser tab title on navigation is what NAV-04 (TITL-04) actually requires.

**Decision for planner:** Use `document.title` + `createEffect` in `DocsPage`. This is the zero-dependency path. If the project later wants SSR-accurate `<title>` for SEO, that's a v2 concern.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `localStorage` for group state | URL-encoded state | URL approach pollutes navigation history |
| `localStorage` for group state | In-memory module-level Map | Resets on full page reload (not persistent) |
| `document.title` in createEffect | `@solidjs/meta` Title component | Meta requires new install + entry-server changes; overkill for this requirement |

---

## Architecture Patterns

### Current Sidebar Data Flow

```
manifest.json
  └── sections[]
        └── items[] (NavItem: id, name, anchor, children?)
              └── children[] (NavItem: id, name, anchor)   ← 3rd level (leaf pages)

Sidebar.tsx
  → SidebarSection (per section)
      → SidebarSubGroup (per item with children)
          → <a> (per child)
      → <a> (per item without children)
```

The hierarchy is already rendered. The gaps are behavioral, not structural.

### Pattern 1: localStorage-backed signal for group collapse

**What:** Initialize `createSignal` from `localStorage` and write back on toggle.
**When to use:** Any stateful UI element whose state should survive SPA navigation.
**Example:**

```typescript
// In SidebarSubGroup
const STORAGE_KEY = `sidebar-group-${props.item.id}`;
const [collapsed, setCollapsed] = createSignal<boolean>(() => {
  // Initialize from localStorage; default to false (expanded)
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored !== null ? stored === "true" : false;
  } catch {
    return false;
  }
});

const toggle = () => {
  const next = !collapsed();
  setCollapsed(next);
  try {
    localStorage.setItem(STORAGE_KEY, String(next));
  } catch { /* ignore quota errors */ }
};
```

**Auto-expand override for NAV-07:**

```typescript
// When the active page is inside this group, force-expand
createEffect(() => {
  if (hasActiveChild() && collapsed()) {
    setCollapsed(false);
    try { localStorage.setItem(STORAGE_KEY, "false"); } catch {}
  }
});
```

This satisfies both NAV-05 (persist collapsed state) and NAV-07 (auto-expand when active child).

### Pattern 2: Detect H1 in markdown for TITL-03

**What:** The same regex used at scan time (`/^#\s+/m`) detects whether content starts with an H1. When true, suppress the `<h1>` wrapper in `MarkdownPage`.
**Example:**

```typescript
// In MarkdownPage
const hasH1 = createMemo(() => /^#\s+/m.test(props.content));

return (
  <div class="max-w-3xl mx-auto px-6 py-8">
    <Show when={!hasH1()}>
      <h1 class="text-3xl font-bold text-text-primary mb-6">{props.title}</h1>
    </Show>
    <div class="markdown-content" innerHTML={html()} />
  </div>
);
```

### Pattern 3: Per-page browser title for TITL-04

**What:** Set `document.title` reactively inside `DocsPage` using `createEffect`. Compose the title from page title + site name.
**Example:**

```typescript
// In DocsPage (docs/[...path].tsx)
import siteConfig from "../../data/site-config.json";

// Inside the component:
createEffect(() => {
  const p = page();
  if (p) {
    document.title = `${p.title} \u2014 ${(siteConfig as any).title}`;
  }
});
```

The em dash separator matches common convention (e.g., "Getting Started — Carl API").

### Pattern 4: SearchDialog children flattening (integration gap fix)

**What:** The current `allItems` loop reads `section.items` but not `item.children`. Add a recursive flatten.
**Example:**

```typescript
// In SearchDialog.tsx — replace the item-push loop with:
function flattenItems(items: any[], sectionTitle: string, into: SearchResult[]) {
  for (const item of items) {
    if (item.children && item.children.length > 0) {
      // Group header: don't add to search (no anchor), recurse into children
      flattenItems(item.children, sectionTitle, into);
    } else if (item.anchor) {
      into.push({
        id: item.id,
        name: item.name,
        section: sectionTitle,
        anchor: item.anchor,
        description: item.description || "",
      });
    }
  }
}

const allItems: SearchResult[] = [];
for (const section of (manifest as any).sections || []) {
  flattenItems(section.items, section.title, allItems);
}
```

### Anti-Patterns to Avoid

- **Don't use a module-level Map for group state:** Module scope is shared across the full SPA session but resets on hard reload. `localStorage` is both persistence-across-navigations AND hard-reload resilient.
- **Don't suppress H1 by string manipulation on the rendered HTML:** Operate on `props.content` (raw markdown) before passing to `marked.parse`, not on the rendered `innerHTML`. The regex `/^#\s+/m` is reliable and was proven correct in Phase 1 (same pattern in `extractFirstH1`).
- **Don't set `document.title` in `onMount` without reactivity:** The slug can change via SPA navigation without unmounting `DocsPage`. Use `createEffect` so the title updates when `page()` changes.
- **Don't add `@solidjs/meta` for TITL-04:** The overhead (new package, entry-server changes) is disproportionate for a static site where SSR title accuracy is not required. The `document.title` approach is client-side-only but fully satisfies the requirement.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Persisting UI state across SPA nav | Custom event system, URL params | `localStorage` with signal initializer | Already in project (`auth-store.ts` uses localStorage) |
| Detecting H1 in markdown | Custom markdown parser | `/^#\s+/m` regex on raw content | Same approach validated in loader.ts Phase 1 |
| Per-page titles | SSR middleware, meta framework | `document.title` in `createEffect` | Zero dependencies, works for SPA navigation |

**Key insight:** The project's `auth-store.ts` already demonstrates the `localStorage` pattern for persisting settings. The sidebar group state persistence is identical in mechanism.

---

## Common Pitfalls

### Pitfall 1: SidebarSubGroup re-mounts on every navigation reset collapse state

**What goes wrong:** In SolidJS, when a list item in `<For>` changes identity (even slightly), the component re-mounts and `createSignal(false)` resets. With the current implementation, navigating between pages causes the sidebar to re-render and groups to forget their collapsed state.
**Why it happens:** SolidJS `<For>` uses keyed reconciliation. If `item.id` is stable (it is — these come from the manifest JSON which doesn't change), the signal component should NOT re-mount. But if the `<For>` is inside a `<Show when={!collapsed()}>` that toggles the parent section, sub-components do re-mount.
**How to avoid:** Use `localStorage` as the source of truth, reading it in the signal initializer. Even if the component re-mounts, the next read from `localStorage` will restore the correct state.
**Warning signs:** Group expands on every page load regardless of previous state.

### Pitfall 2: Auto-expand creates infinite update loop

**What goes wrong:** `createEffect(() => { if (hasActiveChild() && collapsed()) setCollapsed(false); })` — if `setCollapsed(false)` triggers a re-render that re-evaluates `hasActiveChild()`, and that remains true, the effect runs again.
**Why it happens:** `createEffect` in SolidJS tracks dependencies. Setting `collapsed` inside an effect that reads `collapsed()` via `hasActiveChild()` is circular.
**How to avoid:** Read `collapsed()` inside the effect guard but only call `setCollapsed` when the condition is true. SolidJS does NOT re-run effects that didn't change their tracked dependencies. Since `setCollapsed(false)` sets a value that makes `collapsed()` return `false`, the next effect run will see `collapsed() === false` and skip the inner branch — no loop.
**Warning signs:** Infinite re-render warning in browser console; browser freezes on page load.

### Pitfall 3: localStorage key collision

**What goes wrong:** Two different groups with the same name (e.g., "Guides" in both `product` and `developer` sections) share a localStorage key.
**Why it happens:** Using `toTitleCase(groupKey)` as the storage key instead of the full `item.id`.
**How to avoid:** Use `item.id` (e.g., `docs-folder-product-guides`) as the localStorage key — it is globally unique by construction.

### Pitfall 4: H1 suppression regex false-positive

**What goes wrong:** A document that starts with a code block containing `# something` triggers H1 detection.
**Why it happens:** `/^#\s+/m` would match `# something` at the start of any line, including inside a fenced code block.
**How to avoid:** The regex uses `^` with `/m` — it matches line-start. The loader's `extractFirstH1` has this same limitation and it was accepted as sufficient (the comment in `loader.ts` says "Returns the raw markdown text"). The actual content is markdown author-controlled — heading-inside-code-block-at-line-start is an edge case that does not occur in practice. Accept the same trade-off.

### Pitfall 5: document.title not set during prerender

**What goes wrong:** When the site is prerended, `document` is not available server-side, so `document.title = ...` in `createEffect` throws during SSR.
**Why it happens:** `createEffect` in SolidJS runs only on the client (effects are not executed during SSR). This is correct behavior — no special guard needed.
**Warning signs:** None expected — SolidJS already suppresses effects on server. But if code that accesses `document` is called outside `createEffect` (e.g., at module level), it will throw during prerender. Keep the assignment strictly inside `createEffect`.

---

## Code Examples

### Complete SidebarSubGroup replacement (NAV-05 + NAV-07)

```typescript
// Source: code analysis of existing Sidebar.tsx + localStorage pattern from auth-store.ts
function SidebarSubGroup(props: {
  item: NavItem;
  activeId?: string;
  isDocSection: boolean;
  onNavigate?: () => void;
}) {
  const STORAGE_KEY = `sidebar-group-${props.item.id}`;

  const [collapsed, setCollapsed] = createSignal<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored !== null ? stored === "true" : false;
    } catch {
      return false;
    }
  });

  const hasActiveChild = () =>
    props.item.children?.some((child) => child.id === props.activeId) ?? false;

  // NAV-07: auto-expand when active child is inside this group
  createEffect(() => {
    if (hasActiveChild() && collapsed()) {
      setCollapsed(false);
      try { localStorage.setItem(STORAGE_KEY, "false"); } catch {}
    }
  });

  const toggle = () => {
    const next = !collapsed();
    setCollapsed(next);
    try { localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
  };

  // ... rest of JSX unchanged, but onClick={() => toggle()}
}
```

### MarkdownPage with H1 suppression (TITL-03)

```typescript
// Source: code analysis of existing MarkdownPage.tsx
export function MarkdownPage(props: { content: string; title: string }) {
  const html = createMemo(() => {
    return marked.parse(props.content, { gfm: true, breaks: false, renderer }) as string;
  });

  const hasH1 = createMemo(() => /^#\s+/m.test(props.content));

  return (
    <div class="max-w-3xl mx-auto px-6 py-8">
      <Show when={!hasH1()}>
        <h1 class="text-3xl font-bold text-text-primary mb-6">{props.title}</h1>
      </Show>
      <div class="markdown-content" innerHTML={html()} />
    </div>
  );
}
```

### DocsPage browser title (TITL-04)

```typescript
// Source: code analysis of existing [...path].tsx + site-config.json
import siteConfig from "../../data/site-config.json";
import { createEffect } from "solid-js";

// Inside DocsPage component body:
createEffect(() => {
  const p = page();
  if (typeof document !== "undefined" && p) {
    document.title = `${p.title} \u2014 ${(siteConfig as any).title}`;
  }
});
```

### SearchDialog children flattening (integration gap)

```typescript
// Source: code analysis of existing SearchDialog.tsx
function flattenNavItems(
  items: any[],
  sectionTitle: string,
  into: SearchResult[]
): void {
  for (const item of items) {
    if (item.children && item.children.length > 0) {
      flattenNavItems(item.children, sectionTitle, into);
    } else if (item.anchor) {
      into.push({
        id: item.id,
        name: item.name,
        section: sectionTitle,
        anchor: item.anchor,
        description: item.description || "",
      });
    }
  }
}

// Replace the existing allItems population block:
const allItems: SearchResult[] = [];
for (const section of (manifest as any).sections || []) {
  flattenNavItems(section.items, section.title, allItems);
}
```

---

## Files to Change

| File | Change | Requirements |
|------|--------|--------------|
| `src/site/src/components/layout/Sidebar.tsx` | `SidebarSubGroup`: localStorage-backed collapse, auto-expand on active child | NAV-05, NAV-07 |
| `src/site/src/components/markdown/MarkdownPage.tsx` | Add H1 detection memo, wrap `<h1>` in `<Show when={!hasH1()}>` | TITL-03 |
| `src/site/src/routes/docs/[...path].tsx` | Add `createEffect` to set `document.title` from `page().title + siteConfig.title` | TITL-04 |
| `src/site/src/components/search/SearchDialog.tsx` | Replace flat item loop with recursive `flattenNavItems` | Integration gap (SearchDialog children) |

NAV-01, NAV-02, NAV-04 require **no code changes** — they are already satisfied by the existing rendering logic. The data layer (Phase 1) produces the correct manifest shape; the sidebar already renders it. The active-state derivation already propagates `activeId` down through `SidebarSection → SidebarSubGroup → child links`. Verification tests should confirm this is working correctly end-to-end.

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| `SidebarSubGroup` collapsed resets on navigation | Use `localStorage` key per group ID | No library needed |
| `MarkdownPage` always shows H1 heading | `<Show when={!hasH1()}>` guard | Regex-based, proven in Phase 1 |
| No per-page browser title | `document.title` in `createEffect` | Client-only, sufficient for static sites |
| `SearchDialog` misses group children | Recursive `flattenNavItems` | One function, ~10 lines |

---

## Open Questions

1. **NAV-01/NAV-02/NAV-04 verification**
   - What we know: The existing `SidebarSubGroup` renders children as `<a>` links. Active state is propagated via `props.activeId`. The manifest already has the correct `children[]` structure.
   - What's unclear: Whether the existing rendering has any visual gap (e.g., missing padding/indentation for the 3rd level) that needs a CSS tweak in addition to confirming correctness.
   - Recommendation: The plan should include a visual verification step using the integration test build against a 3-level docs fixture (`product/guides/filtering.md`).

2. **localStorage availability during SSR prerender**
   - What we know: `createEffect` runs only on the client in SolidJS — localStorage access inside `createEffect` is safe.
   - What's unclear: The `createSignal` initializer function (`createSignal(() => localStorage.getItem(...))`) — does SolidJS call signal initializers on the server during prerender?
   - Recommendation: Wrap the `localStorage` access in the signal initializer with `typeof window !== "undefined"` guard, matching the existing pattern in `Sidebar.tsx` (line 21: `typeof window !== "undefined" ? window.location.hash : ""`).

3. **Group items in search results (doc section badge)**
   - What we know: `SearchDialog` has `sectionBadge` entries for schema types but not for docs sections. Docs section names like "Product" or "Developer" will fall through to the default badge.
   - What's unclear: Is a "DOC" badge label desired for doc search results?
   - Recommendation: The planner should decide — a simple `"DOC"` label for any section starting with `"docs"` is trivial to add alongside the fix.

---

## Sources

### Primary (HIGH confidence)
- Direct code reading of `src/site/src/components/layout/Sidebar.tsx` — current collapsed state, active detection, SidebarSubGroup implementation
- Direct code reading of `src/site/src/components/markdown/MarkdownPage.tsx` — unconditional H1 render
- Direct code reading of `src/site/src/routes/docs/[...path].tsx` — DocsPage route structure, `page()` memo, `siteConfig` not yet imported
- Direct code reading of `src/site/src/components/search/SearchDialog.tsx` — flat item loop, missing children recursion (lines 21-31)
- Direct code reading of `src/site/src/data/site-config.json` — title field present
- Direct code reading of `src/cli/build.ts` — `buildNavigationManifest` produces `children[]` on group items
- Direct code reading of `src/site/src/lib/auth-store.ts` — confirms `localStorage` pattern is already in use in this codebase
- Direct code reading of `src/site/package.json` — no `@solidjs/meta` installed

### Secondary (MEDIUM confidence)
- SolidJS documentation knowledge: `createEffect` does not run on server during SSR; `createSignal` initializer function runs synchronously at signal creation time
- SolidJS `<Show>` component correctly handles conditional rendering

### Tertiary (LOW confidence — not needed)
- No WebSearch was required — all findings derived from direct code inspection

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use; no new dependencies
- Architecture: HIGH — existing code patterns clearly show the gaps and their fixes
- Pitfalls: HIGH — identified from code analysis of existing patterns
- NAV-01/NAV-02/NAV-04 status: HIGH — already satisfied structurally; verification needed
- localStorage SSR safety: MEDIUM — known SolidJS behavior, requires `typeof window` guard

**Research date:** 2026-02-20
**Valid until:** 2026-04-20 (stable stack — SolidJS 1.9.x, @solidjs/router 0.15.x, @solidjs/start 1.1.x)

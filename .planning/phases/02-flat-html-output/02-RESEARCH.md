# Phase 2: Flat HTML Output - Research

**Researched:** 2026-02-20
**Domain:** Nitro prerender configuration, SolidJS router static output, GCS/S3 static hosting
**Confidence:** HIGH

## Summary

Phase 2 converts yolodocs output from the default Nitro subfolder layout (`docs/getting-started/index.html`) to a flat HTML layout (`docs/getting-started.html`). This is the standard approach for serving static HTML on object storage (GCS/S3) without configuring URL rewriting. Nitro 2.13.1 ships a single boolean flag — `prerender.autoSubfolderIndex` — that controls this behavior, and it is directly accessible via the `server.prerender` block in `app.config.ts`. No additional libraries or dependencies are required.

The phase touches four files in a deliberate cascade: (1) `app.config.ts` enables flat output from Nitro, (2) `src/cli/build.ts` appends `.html` to doc anchor URLs in the navigation manifest, (3) `src/site/src/components/layout/Sidebar.tsx` updates active-state derivation to strip `.html` from the browser pathname, and (4) `src/site/src/routes/docs/[...path].tsx` strips `.html` from `params.path` before looking up the page. A fifth location, `WelcomePage.tsx`, also builds a `/docs/` link that must gain the `.html` suffix.

One structural constraint shapes the entire approach: Nitro's link crawler only follows extensionless and `.json` hrefs (`allowedExtensions = new Set(["", ".json"])`). This means `.html` links are **never crawled**. However, the codebase already enumerates all doc routes explicitly in `prerenderRoutes` inside `app.config.ts`, so crawling is not load-bearing for doc pages. The crawler can remain enabled for non-doc routes without issue.

**Primary recommendation:** Set `prerender.autoSubfolderIndex: false` in `app.config.ts`; append `.html` to all doc `anchor` strings in `buildNavigationManifest`; strip `.html` from pathname/params in two client-side locations.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HOST-01 | Prerender output produces flat HTML files (e.g., `architecture.html` instead of `architecture/index.html`) | Nitro `prerender.autoSubfolderIndex: false` in `app.config.ts` enables this directly |
| HOST-02 | Direct URL access works on GCS/S3 without clean-URL resolution or server-side rewrites | Flat `.html` files are served by object storage as-is when the URL matches the filename exactly; no rewrite rules needed |
| HOST-03 | Sidebar anchor hrefs match the flat HTML file paths | `buildNavigationManifest` in `build.ts` must emit anchors as `/docs/${slug}.html` instead of `/docs/${slug}` |
| HOST-04 | Active state derivation handles `.html` extension in URL pathname | `Sidebar.tsx` `derivedActiveId` must strip `.html` before constructing `doc-${slug}` id; `[...path].tsx` must strip `.html` before page lookup |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| nitropack | 2.13.1 (installed) | Prerender engine that controls file output naming | Already the build engine; `autoSubfolderIndex` is the canonical flag |
| @solidjs/start | 1.2.1 (installed) | Passes `server.*` config directly to nitropack | Already used; `defineConfig({ server: { prerender: { autoSubfolderIndex: false } } })` is the integration point |
| @solidjs/router | 0.15.4 (installed) | Client-side routing that reads `location.pathname` | Already used; pathname includes `.html` on direct static access |

### Supporting

No additional libraries are needed. All required functionality is in the existing stack.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `autoSubfolderIndex: false` | Post-build file rename script | The rename approach would require inspecting every output file, handling base-path prefixes, and updating cross-references — far more fragile |
| `.html` anchors in manifest | Hash-based navigation | Rejected in REQUIREMENTS.md Out of Scope section: "Rejected — flat HTML files solve hosting compatibility more cleanly" |
| Stripping `.html` at runtime | Redirect from `.html` to clean URL | Redirects require server infrastructure, defeating the purpose |

## Architecture Patterns

### Recommended Project Structure

No new files or directories are needed. All changes are edits to existing files:

```
src/site/app.config.ts                          # Add autoSubfolderIndex: false
src/cli/build.ts                                # Append .html to doc anchors in buildNavigationManifest
src/site/src/components/layout/Sidebar.tsx      # Strip .html in derivedActiveId
src/site/src/routes/docs/[...path].tsx          # Strip .html from params.path before page lookup
src/site/src/components/welcome/WelcomePage.tsx # .html on first-doc href (if needed after anchor change)
```

### Pattern 1: Nitro Flat Prerender

**What:** Setting `prerender.autoSubfolderIndex: false` tells Nitro to name HTML files as `route.html` instead of `route/index.html`.

**Exact code in Nitro 2.13.1** (`nitropack/dist/core/index.mjs` line 2120):
```javascript
const htmlPath = route.endsWith("/") || nitro.options.prerender.autoSubfolderIndex
  ? joinURL(route, "index.html")   // default: subdirectory
  : route + ".html";               // flat: when autoSubfolderIndex=false
```

Routes ending in `/` (like `/`) always become `index.html` regardless of this setting.

**When to use:** Always when targeting GCS/S3 or any object storage without URL rewriting.

**Example — `app.config.ts` change:**
```typescript
// Source: verified directly from nitropack/dist/core/index.mjs + @solidjs/start/config/index.js
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
  vite: { plugins: [tailwindcss()] },
});
```

### Pattern 2: Anchor URL Generation with `.html`

**What:** `buildNavigationManifest` in `build.ts` generates the `anchor` field for each doc nav item. Currently it emits `/docs/${slug}`. With flat HTML, it must emit `/docs/${slug}.html`.

**Current code (build.ts ~line 302):**
```typescript
anchor: `${base}/docs/${p.slug}`,
```

**Required change:**
```typescript
anchor: `${base}/docs/${p.slug}.html`,
```

This applies at every location where doc anchors are set (root pages, section ungrouped pages, and group child pages — three identical patterns in `buildNavigationManifest`).

### Pattern 3: Active State — Strip `.html` from Pathname

**What:** When a user opens `docs/getting-started.html` directly from GCS/S3, `location.pathname` is `/docs/getting-started.html`. The current active-state code strips the `/docs/` prefix but leaves the `.html` suffix, producing id `doc-getting-started.html` which never matches any sidebar item id `doc-getting-started`.

**Current code (Sidebar.tsx lines 39-43):**
```typescript
const docsPrefix = withBase("/docs/");
if (pathname.startsWith(docsPrefix)) {
  const slug = pathname.slice(docsPrefix.length);
  return `doc-${slug}`;
}
```

**Required change — strip `.html` before building id:**
```typescript
const docsPrefix = withBase("/docs/");
if (pathname.startsWith(docsPrefix)) {
  const rawSlug = pathname.slice(docsPrefix.length);
  const slug = rawSlug.endsWith(".html") ? rawSlug.slice(0, -5) : rawSlug;
  return `doc-${slug}`;
}
```

### Pattern 4: Route Params — Strip `.html` Before Page Lookup

**What:** When `[...path].tsx` handles `/docs/getting-started.html`, `params.path` is `"getting-started.html"`. The page lookup `p.slug === slug()` fails because page slugs are stored without `.html`.

**Current code (routes/docs/[...path].tsx line 25):**
```typescript
const slug = createMemo(() => params.path || "");
```

**Required change:**
```typescript
const slug = createMemo(() => {
  const raw = params.path || "";
  return raw.endsWith(".html") ? raw.slice(0, -5) : raw;
});
```

### Anti-Patterns to Avoid

- **Changing slug storage:** Do not add `.html` to the `slug` field in docs-manifest.json or the DocsPage type. Slugs are internal identifiers; only the rendered `anchor` URL needs the extension.
- **Changing prerender route list format:** Prerender routes in `app.config.ts` are listed as `/docs/slug` (no `.html`). Nitro fetches them by their clean path and appends `.html` itself when writing the file. Do not add `.html` to the `prerenderRoutes` array.
- **Using crawlLinks to discover `.html` pages:** The Nitro crawler only follows extensionless and `.json` links (`allowedExtensions = new Set(["", ".json"])`). `.html` links are silently ignored by the crawler. All doc routes are already listed explicitly, so this is safe — but don't remove `crawlLinks: true` either (it handles `/reference` cross-links).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Flat file output | Custom post-build rename script | `autoSubfolderIndex: false` | One flag in nitropack handles all edge cases (baseURL stripping, trailing slash routes, content-type inference) |
| `.html` extension detection | Complex regex | `rawSlug.endsWith(".html") ? rawSlug.slice(0, -5) : rawSlug` | Simple string operation is sufficient; slugs are controlled and can never end in `.html` legitimately |

**Key insight:** Nitro's `autoSubfolderIndex` is precisely the right abstraction — it sits at the prerender output layer where file naming is decided, before any filesystem writes occur.

## Common Pitfalls

### Pitfall 1: baseURL Doubling

**What goes wrong:** When `baseURL` is non-empty (e.g. `/v2`), Nitro's prerender pipeline prefixes routes with `baseURL` when fetching internally (`withBase(encodedRoute, nitro.options.baseURL)`), then strips it again with `withoutBase` when writing the filename. If routes in `prerenderRoutes` are already base-prefixed (e.g. `/v2/docs/slug`), the base would be applied twice during fetch.

**Why it happens:** The current `app.config.ts` builds routes as `/docs/${slug}` (no base prefix). The `baseURL` is passed separately to the `server` config. Nitro applies it internally. This is correct. The concern in STATE.md is about verifying the actual output directory structure (does the file land at `v2/docs/slug.html` or `docs/slug.html`?) after adding `autoSubfolderIndex: false`.

**How to avoid:** Do not add the base to `prerenderRoutes` entries — they are already base-relative. Run `YOLODOCS_DEBUG=1` to keep the build temp dir and inspect `.output/public/` layout after enabling flat output to verify the exact directory structure before finalizing anchor URLs.

**Warning signs:** Build succeeds but output has `index.html` files instead of flat `.html` files (indicates `autoSubfolderIndex: false` was not applied), or the file layout has double-nested base paths.

### Pitfall 2: Crawler Ignoring `.html` Links

**What goes wrong:** If `crawlLinks: true` is relied on to discover doc pages, switching to `.html` anchors breaks discovery because the Nitro crawler filters out all links with extensions other than `""` and `".json"`.

**Why it happens:** The crawler's `allowedExtensions` set is hardcoded in nitropack. It's designed for clean-URL sites.

**How to avoid:** The explicit `prerenderRoutes` list already covers all doc pages — this is the right mechanism. `crawlLinks: true` is a belt-and-suspenders for non-doc internal links. No change needed here.

**Warning signs:** Fewer prerendered routes than expected (would only happen if routes were removed from the explicit list AND crawling was the only discovery mechanism).

### Pitfall 3: Test Coverage Gap on Anchor Format

**What goes wrong:** The existing `buildNavigationManifest` tests assert anchor values as `/docs/${slug}`. After adding `.html`, those tests fail. If tests aren't updated, CI catches the failure but the PR can't land cleanly.

**Why it happens:** Phase 2 changes anchor format, which is a contract change tested in `src/cli/build.test.ts`.

**How to avoid:** Update all `expect(item.anchor).toBe("/docs/...")` assertions in `build.test.ts` to expect `/docs/....html`. TDD approach: update tests first (they will fail), then change production code (they pass).

**Warning signs:** `npm test` output shows failures in `buildNavigationManifest` describe block.

### Pitfall 4: WelcomePage First-Doc Link

**What goes wrong:** `WelcomePage.tsx` constructs a "Guides" card href as `withBase(\`/docs/${pages[0]?.slug}\`)`. This bypasses the manifest anchor and builds the URL directly. After the manifest change, this link would still be extensionless while the actual file is `.html`.

**Why it happens:** The link is hardcoded against the slug rather than reading from the manifest's `anchor` field.

**How to avoid:** Either (a) read the first page's anchor from the manifest's items (which already has `.html` after the manifest change), or (b) append `.html` directly in WelcomePage. Option (a) requires accessing `manifest.sections[0].items[0].anchor` rather than `docsManifest.pages[0].slug`. Option (b) is simpler: `withBase(\`/docs/${pages[0]?.slug}.html\`)`.

**Warning signs:** The Guides card on the home page navigates to a 404 on GCS/S3 while all sidebar links work correctly.

### Pitfall 5: SearchDialog Doc Navigation

**What goes wrong:** `SearchDialog.tsx` navigates to doc pages via `window.location.href = result.anchor`. The `anchor` field comes from the navigation manifest. After the manifest change to include `.html`, this should work automatically. However, the detection logic `result.anchor.startsWith("/docs/")` must still match `.html`-suffixed anchors — and it does, since the prefix check is on `/docs/` not on the full path.

**How to avoid:** No change required to SearchDialog if anchor detection uses prefix check (which it already does). Verify after manifest change that search navigation works.

### Pitfall 6: Route `[...path].tsx` Matching at Prerender Time (SSR)

**What goes wrong:** During prerender, Nitro renders `/docs/getting-started` (extensionless route) through the SSR handler. At SSR time, `params.path = "getting-started"` (no `.html`). The `.html` stripping logic in the `slug` memo must be defensive (handle both with and without `.html`). The `? raw.slice(0, -5) : raw` branch handles this correctly.

**Why it happens:** Prerender uses the route URL without extension; browsers use the file URL with extension on direct access.

**How to avoid:** Use `endsWith(".html")` guard — already correct in the proposed change. Always test both the prerender path (no `.html`) and the direct browser access path (`.html`).

## Code Examples

Verified patterns from direct source code inspection:

### `app.config.ts` — Enable Flat Prerender
```typescript
// Verified: nitropack/dist/core/index.mjs line 2120
// autoSubfolderIndex: false → route + ".html" instead of route/index.html
export default defineConfig({
  server: {
    baseURL: base || undefined,
    preset: "static",
    prerender: {
      routes: prerenderRoutes,
      crawlLinks: true,
      failOnError: true,
      autoSubfolderIndex: false,
    },
  },
  vite: { plugins: [tailwindcss()] },
});
```

### `build.ts` — Anchor URL with `.html`
```typescript
// Doc anchor format change — applied in THREE places in buildNavigationManifest:
// 1. Root section items
// 2. Section ungrouped items
// 3. Group child items
anchor: `${base}/docs/${p.slug}.html`,
```

### `Sidebar.tsx` — Active State with `.html` Stripping
```typescript
// In derivedActiveId():
const docsPrefix = withBase("/docs/");
if (pathname.startsWith(docsPrefix)) {
  const rawSlug = pathname.slice(docsPrefix.length);
  const slug = rawSlug.endsWith(".html") ? rawSlug.slice(0, -5) : rawSlug;
  return `doc-${slug}`;
}
```

### `[...path].tsx` — Slug Lookup with `.html` Stripping
```typescript
const slug = createMemo(() => {
  const raw = params.path || "";
  return raw.endsWith(".html") ? raw.slice(0, -5) : raw;
});
```

### `build.test.ts` — Updated Anchor Assertions
```typescript
// All expect(item.anchor).toBe("/docs/slug") become:
expect(section.items[0].anchor).toBe("/docs/getting-started.html");
// etc.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `autoSubfolderIndex: true` (default) | `autoSubfolderIndex: false` | Nitro 2.x introduced the flag | Enables flat HTML without a post-build rename script |
| Crawler-only route discovery | Explicit route list + crawler | Already done in this codebase | Correct foundation for `.html` — crawler won't follow `.html` links but explicit list covers all doc pages |

**No deprecated features involved.** All mechanisms used are current Nitro 2.x APIs.

## Open Questions

1. **baseURL + flat output interaction**
   - What we know: Nitro applies baseURL internally during prerender fetch, then strips it for file naming. Routes in `prerenderRoutes` are base-relative (no base prefix). With `autoSubfolderIndex: false`, the file naming formula is `route + ".html"` after `withoutBase`.
   - What's unclear: Whether the actual output lands in the expected directory structure when `base` is non-empty in `site-config.json`. The concern is documented in STATE.md.
   - Recommendation: Run a debug build (`YOLODOCS_DEBUG=1`) at the start of Phase 2 execution with a non-empty `base` config to inspect `.output/public/` layout before finalizing the implementation. If the existing test schema build (no base) works correctly, confirm separately with `--base /v2` flag.

2. **`crawlLinks: true` with `.html` anchors — unexpected crawl behavior**
   - What we know: The Nitro crawler ignores links with extensions other than `""` and `".json"`. Setting `crawlLinks: true` still works; `.html` links are just not followed.
   - What's unclear: Whether any internal link (e.g. from `/reference` page linking to a doc) would be crawled and fail. In this codebase, cross-links between docs and reference sections go through the manifest and sidebar, not HTML `<a>` tags in the reference page. Likely not an issue.
   - Recommendation: Leave `crawlLinks: true` unchanged. It continues to handle same-origin extensionless links. No action required.

## Sources

### Primary (HIGH confidence)
- `/Users/tomasstrejcek/Dev/yolodocs/src/site/node_modules/nitropack/dist/core/index.mjs` line 109 (default), line 2120 (prerender logic) — direct source inspection of installed nitropack 2.13.1
- `/Users/tomasstrejcek/Dev/yolodocs/src/site/node_modules/nitropack/dist/shared/nitro.DLF2_KRt.d.ts` — TypeScript type definition confirms `autoSubfolderIndex: boolean` in `prerender` options
- `/Users/tomasstrejcek/Dev/yolodocs/src/site/node_modules/@solidjs/start/config/index.js` — confirms `server` config is passed directly to nitropack: `server: { compressPublicAssets: {...}, ...server }`
- `/Users/tomasstrejcek/Dev/yolodocs/src/site/src/components/layout/Sidebar.tsx` — active state derivation code (lines 38-48)
- `/Users/tomasstrejcek/Dev/yolodocs/src/site/src/routes/docs/[...path].tsx` — route handler and params.path usage (lines 23-25)
- `/Users/tomasstrejcek/Dev/yolodocs/src/cli/build.ts` — `buildNavigationManifest` anchor construction (lines 299-340)
- `/Users/tomasstrejcek/Dev/yolodocs/src/site/app.config.ts` — prerender routes and server config
- `/Users/tomasstrejcek/Dev/yolodocs/src/site/node_modules/nitropack/dist/core/index.mjs` line 1810 — `allowedExtensions = new Set(["", ".json"])` (crawler extension filter)

### Secondary (MEDIUM confidence)
- `/Users/tomasstrejcek/Dev/yolodocs/src/site/src/components/search/SearchDialog.tsx` — doc anchor detection logic confirmed uses prefix check, no change required
- `/Users/tomasstrejcek/Dev/yolodocs/src/site/src/components/welcome/WelcomePage.tsx` line 130 — direct slug-based link construction identified as requiring `.html` append

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified from installed `package.json` files; mechanism verified from source
- Architecture: HIGH — exact code locations identified; change patterns are mechanical string operations
- Pitfalls: HIGH for crawlLinks and anchor format; MEDIUM for baseURL interaction (mechanism understood but output layout unverified at runtime)

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (nitropack APIs are stable; @solidjs/start 1.x lifecycle is active)

# PITFALLS.md

**Domain:** Multi-level sidebar navigation, content-derived titles, flat HTML file output for SolidStart static documentation generator.
**Milestone:** Subsequent — extending an existing working system.
**Date:** 2026-02-20

---

## P1 — Recursive slug collisions from nested folders

**What goes wrong:** The existing slug generator (`src/markdown/loader.ts`) strips the `.md` extension and replaces backslashes, producing slugs like `product/architecture`. When 3-level nesting is added (e.g., `developer/api/authentication`), two different files at different depths can produce the same slug segment if a file and a directory share the same name (e.g., `developer/api.md` and `developer/api/intro.md` both produce slugs starting with `developer/api`). The slug is also the key used to resolve the content module glob in `[...path].tsx` — a collision causes the wrong content to be loaded silently.

**Warning signs:**
- A doc page renders with content from a different page.
- The `contentModules` glob in `[...path].tsx` has two entries with the same key prefix.
- Docs for `developer/api` and `developer/api/intro` both match route `/docs/developer/api`.

**Prevention strategy:**
- Assert slug uniqueness after `scanDir` completes: throw a build-time error if any two pages share a slug.
- Document and enforce the convention that a file and a directory cannot share the same basename within the same parent (e.g., `api.md` and `api/` cannot coexist in `developer/`).
- Add a unit test to `src/cli/build.test.ts` for slug collision detection using a fixture directory with a name-clash layout.

**Phase:** Docs scanning (`src/markdown/loader.ts`) and navigation manifest building (`buildNavigationManifest` in `src/cli/build.ts`). Address during slug generation refactor.

---

## P2 — SolidStart prerender misses nested doc routes

**What goes wrong:** `app.config.ts` builds `prerenderRoutes` by iterating `docsManifest.pages` and pushing `/docs/${page.slug}`. With 3-level slugs like `developer/api/authentication`, the pushed route is `/docs/developer/api/authentication`. SolidStart's `[...path].tsx` catch-all matches this at runtime, but Nitro's static prerenderer may or may not follow it depending on the `crawlLinks` setting and whether the link appears in rendered HTML. If prerender misses even one route, the output directory will contain no HTML file for that path, resulting in a 404 on GCS with no error during build.

**Warning signs:**
- The prerender summary (`Prerendered N routes`) count is lower than the number of pages × 1 (index, reference, plus each doc page).
- The `.output/public/docs/` directory is missing subdirectories for nested slugs after a test build.
- Links in the sidebar for 2nd- or 3rd-level pages exist, but the HTML file is absent from the output.

**Prevention strategy:**
- Continue to enumerate all doc routes explicitly in `prerenderRoutes` (already done for 1-level slugs). Verify the loop also covers nested slugs — it will, as long as `page.slug` already contains slashes.
- After each test build, assert that the output directory contains one `.html` file per doc page slug. This can be a vitest test or a post-build validation step in `build.ts`.
- Enable `failOnError: true` (already set) and verify it actually surfaces missing-route errors in the Nitro version in use.

**Phase:** Build pipeline (`src/site/app.config.ts`) and post-build validation (`src/cli/build.ts`). Validate during integration test after 3-level folder structure is introduced.

---

## P3 — Flat HTML output for nested slugs produces wrong file paths

**What goes wrong:** The planned flat HTML output emits `architecture.html` for a top-level page. But for a nested page with slug `developer/api/authentication`, the natural prerender output is `docs/developer/api/authentication/index.html` (clean URL style). Switching to flat output at the top level doesn't automatically flatten nested slugs — the Nitro static preset may still emit `authentication/index.html` inside a subdirectory rather than `authentication.html` at the top of `docs/`. On GCS this still breaks direct URL access if the full path contains subdirectories that GCS cannot resolve as clean URLs.

**Warning signs:**
- After enabling flat output, files for top-level pages appear correctly as `.html`, but nested doc pages still appear as `path/to/page/index.html` directories.
- Copying `.output/public/` to the output dir results in nested directories on disk.
- Direct URL access to `https://api.example.dev/docs/developer/api/authentication` 404s on GCS even after the flat output change.

**Prevention strategy:**
- Decide the output strategy before implementation: either (a) all doc pages use a flat namespace (slugs become `developer-api-authentication.html`, using `-` instead of `/` in the filename), or (b) accept one level of directory nesting for GCS serving (add an index file or use GCS `MainPageSuffix`). Document which option is chosen in `PROJECT.md`.
- If choosing truly flat output, perform a post-build rename step in `build.ts` that walks the `.output/public/docs/` directory, flattens nested `index.html` files to `<slug-with-dashes>.html`, and rewrites any internal links.
- Alternatively, avoid the rename by generating slugs with dashes instead of slashes for paths deeper than one level.
- Add an integration test that builds with a 3-level docs fixture and asserts the output file layout.

**Phase:** Build output step (`src/cli/build.ts`, specifically after `fse.copySync`). Must be resolved before the flat HTML requirement is considered done.

---

## P4 — Title derived from first H1 does not match sidebar label when H1 is missing or has extra markup

**What goes wrong:** The plan is to derive the sidebar label from the first H1 in the markdown content rather than the frontmatter `title`. The first H1 may: (a) not exist at all (the file starts with H2 or prose), (b) contain inline markup like `**bold**`, links, or inline code that produce HTML rather than plain text when parsed through `marked`, (c) differ in phrasing from the intended menu label. When the sidebar renders the raw HTML string (e.g., `<code>createUser</code> Mutation`), it appears garbled in the nav.

**Warning signs:**
- Sidebar items with code backticks in the title render as literal HTML tags in the nav.
- A doc page with no H1 has an empty or `undefined` sidebar label.
- The page `<h1>` tag is rendered twice: once by the sidebar label and once by the rendered markdown content, because `MarkdownPage` already injects a `<h1>` from `props.title` (line 28 of `MarkdownPage.tsx`) and the markdown body also starts with `# Title`.

**Prevention strategy:**
- Extract the first H1 using a lightweight regex on the raw markdown source (not the rendered HTML): `/^#\s+(.+)$/m`. Strip any inline markdown from the captured group using a second pass through `marked` with `inline: true` and then strip HTML tags.
- Fall back to `frontmatter.title` → filename if no H1 is found; never emit an empty or `undefined` title.
- Decide at implementation time whether `MarkdownPage` should omit its explicit `<h1>` when the content already starts with one. This is a binary choice — document it. The safest default is: if a title is derived from H1, strip the H1 from the content before passing to `MarkdownPage`, so it is rendered exactly once.
- Add a unit test to `loader.ts` that verifies H1 extraction for: plain text, text with inline code, text with bold, and missing H1.

**Phase:** Markdown loader (`src/markdown/loader.ts`) and `MarkdownPage` component (`src/site/src/components/markdown/MarkdownPage.tsx`). Address at the same time as slug/title changes.

---

## P5 — `SidebarSubGroup` does not recurse — third level renders as flat links or is invisible

**What goes wrong:** The current `SidebarSubGroup` component (`Sidebar.tsx` lines 141–205) renders `props.item.children` as a flat list of `<a>` tags. It does not check whether a child itself has `children`. If a 3-level structure is introduced (`category → subcategory → page`) and the manifest contains items with `children[0].children`, the third level is silently dropped. No TypeScript error occurs because `NavItem.children` is `NavItem[]` (recursive type) but the render function ignores that recursion.

**Warning signs:**
- Pages nested at depth 3 appear in `manifest.json` (check under `children[].children`) but have no corresponding `<a>` in the sidebar DOM.
- Clicking a subcategory collapses it but shows no child items for pages in that subcategory.
- `buildNavigationManifest` in `build.ts` correctly produces 3-level items, but the sidebar renders them flat.

**Prevention strategy:**
- Refactor `SidebarSubGroup` into a recursive component (or a shared `SidebarItem` component) that handles arbitrary nesting up to the agreed 3-level cap. Use a `depth` prop to cap recursion and apply appropriate indentation.
- Add a TypeScript type guard: if `item.children && item.children.length > 0`, render recursively; otherwise render an `<a>`.
- Write a Vitest component test (or a manual smoke test using the integration build) that verifies a 3-level manifest produces the correct DOM nesting in the sidebar. At minimum, verify it during the integration test build.

**Phase:** Sidebar component (`src/site/src/components/layout/Sidebar.tsx`). Must be addressed in the same commit as the 3-level navigation manifest changes.

---

## P6 — `derivedActiveId` does not match doc-page IDs for nested slugs

**What goes wrong:** `derivedActiveId()` in `Sidebar.tsx` (lines 36–49) computes the active item by extracting the slug from the pathname: `pathname.slice(docsPrefix.length)` and returning `doc-${slug}`. For a top-level page at `/docs/getting-started`, this produces `doc-getting-started`, which matches the manifest item ID `doc-getting-started`. For a nested page at `/docs/developer/api/authentication`, the derived ID becomes `doc-developer/api/authentication`. The manifest item ID must exactly match this string for the sidebar to highlight the correct item. If the manifest builder uses a different delimiter (e.g., `doc-developer-api-authentication` with hyphens), active highlighting silently breaks.

**Warning signs:**
- After navigating to a nested doc page, no sidebar item appears highlighted.
- The active item highlights a parent group instead of the specific page.
- The `derivedActiveId()` signal returns a string that doesn't exist in any manifest `id` field.

**Prevention strategy:**
- Use a single authoritative ID construction function shared by both `buildNavigationManifest` (in `build.ts`) and `Sidebar.tsx`. The safest form is `doc-${slug}` where `slug` always uses forward-slash separators. Both the manifest writer and the sidebar reader must agree on this format.
- Add an assertion in `derivedActiveId()` that the derived ID appears somewhere in the manifest; log a warning in development if not.
- Include a test that builds a 3-level fixture and verifies that IDs in the manifest match what `derivedActiveId()` would compute for the corresponding URL.

**Phase:** Navigation manifest builder (`src/cli/build.ts`) and Sidebar component (`src/site/src/components/layout/Sidebar.tsx`). Address together.

---

## P7 — Nitro prerender output layout changes with base path — flat vs nested is non-deterministic

**What goes wrong:** The `base` config option (e.g., `/docs`) is injected into `app.config.ts` via `site-config.json` and passed as `baseURL` to the Nitro server config. Nitro's static preset with a `baseURL` sometimes emits output relative to the base (so `index.html` maps to `<base>/index.html`) and sometimes strips the base. When a `base` of `/docs` is set and the route is `/docs/developer/api/page`, the output file may land at `.output/public/docs/developer/api/page/index.html` or `.output/public/developer/api/page/index.html` depending on Nitro version. The `fse.copySync` to `outputDir` then places files at the wrong path for GCS.

**Warning signs:**
- After a test build with `--base /docs`, the `index.html` is in `test-output/` but nested doc pages land in `test-output/docs/` subdirectory (double prefix).
- GCS serves `https://example.dev/docs/index.html` but `https://example.dev/docs/docs/page` for nested pages.
- The existing `PROJECT.md` note: "Current URL pattern doubles the prefix: base path `/docs/` + route `/docs/{slug}` = `/docs/docs/{slug}`" — this is a known symptom of this exact problem.

**Prevention strategy:**
- Audit the current Nitro output with `YOLODOCS_DEBUG=1` for both a no-base and a with-base build to understand the actual output layout before implementing flat HTML output.
- Set the route as `/page` (without base prefix) inside the SolidStart route definitions, and rely on the `baseURL` in `app.config.ts` to prepend the base during prerender — do not include the base in the route string itself.
- After copying output to `outputDir`, add a post-build check that verifies `index.html` is at the root of `outputDir` and not inside a subdirectory matching `base`.

**Phase:** Build pipeline (`src/cli/build.ts`) and site configuration (`src/site/app.config.ts`). Must verify behavior with `YOLODOCS_DEBUG=1` before implementing flat output changes.

---

## P8 — `import.meta.glob` does not pick up runtime-generated `.js` files for nested slug paths

**What goes wrong:** `[...path].tsx` uses `import.meta.glob("../../data/docs-pages/**/*.js", { import: "default" })` to lazy-load doc content. This glob is evaluated at Vite/Vinxi compile time: it resolves to the files that exist in `docs-pages/` at build time. For nested slugs like `developer/api/authentication`, the build step writes the file to `docs-pages/developer/api/authentication.js` (with `fse.ensureDirSync` creating the parent directory). The glob pattern `**/*.js` should match this. However, Vite resolves the glob relative to the source file location at build time and constructs module IDs like `../../data/docs-pages/developer/api/authentication.js`. The lookup in `loadContent` uses `const key = \`../../data/docs-pages/${slug}.js\`` where `slug = "developer/api/authentication"`. This will match if the glob resolved the same path. If it does not (e.g., due to path normalization differences on Windows-style builds), the module returns `""` with no error.

**Warning signs:**
- Nested doc pages render with empty content even though the `.js` file exists in the output directory.
- Console shows no error, but `content()` is always `""` for pages with slashes in the slug.
- On macOS/Linux the content loads correctly, but a CI build on Windows produces empty content.

**Prevention strategy:**
- After the build injects `docs-pages/` files, add a validation step in `build.ts` that verifies the glob keys in the compiled output cover all registered page slugs. This requires running a quick `node -e` check or inspecting the built JS bundle.
- Normalize all slug path separators to forward-slash before constructing the glob key, regardless of OS.
- Add the nested-slug case to the regression tests in `src/cli/build.test.ts`: write a fixture with `developer/api/authentication` slug and verify the `.js` file is created at the expected nested path.

**Phase:** Docs data injection (`src/cli/build.ts`) and dynamic route component (`src/site/src/routes/docs/[...path].tsx`). Address during the file-writing and glob-key changes.

---

## P9 — Sidebar auto-collapse loses context for active nested items

**What goes wrong:** Each `SidebarSection` and `SidebarSubGroup` starts with `createSignal(false)` — collapsed = false by default. When a user loads the page directly at a nested URL (e.g., `/docs/developer/api/authentication`), the sidebar renders with all sections open. But if the implementation changes default to collapsed (e.g., for space on mobile), the active page's parent section and subcategory will both be collapsed, making the active item invisible with no scroll-into-view. There is also a related existing issue: `SidebarSubGroup.hasActiveChild()` only checks direct children (`props.item.children?.some(child => child.id === props.activeId)`). With 3 levels, a grandchild being active will not propagate upward through two levels of `hasActiveChild`, so parent sections won't show their "active child" highlight state.

**Warning signs:**
- The active sidebar item is highlighted but the parent section header does not show the active-child style.
- On page load at a nested URL, the correct nav item is active but hidden because both its parent and grandparent are collapsed.
- `hasActiveChild()` returns `false` for a subcategory group even though one of its children's children is the current page.

**Prevention strategy:**
- Implement `hasActiveDescendant()` using a recursive tree walk that checks any depth of children, not just direct children.
- Initialize `collapsed` signal to `false` if any descendant is active (check `hasActiveDescendant()` in the initial signal value); keep `collapsed = false` as default otherwise.
- When navigating to a new page, ensure the parent sections auto-expand. Using `createEffect` to watch `derivedActiveId()` and call `setCollapsed(false)` on the section containing the active item is the clean approach.
- Test by loading the built output directly at a 3rd-level page URL and verifying the sidebar shows the correct active trail.

**Phase:** Sidebar component (`src/site/src/components/layout/Sidebar.tsx`). Address as part of the recursive rendering refactor.

---

## P10 — `docs-pages/` file path construction breaks when slug contains directory separators on the filesystem

**What goes wrong:** `build.ts` writes each doc page as:
```typescript
const pageFile = path.join(docsPagesDir, `${page.slug}.js`);
fse.ensureDirSync(path.dirname(pageFile));
fs.writeFileSync(pageFile, `export default ${JSON.stringify(page.content)};`);
```
For a slug of `developer/api/authentication`, `path.join` produces `docs-pages/developer/api/authentication.js` and `fse.ensureDirSync` creates the parent `docs-pages/developer/api/`. This is already handled correctly in principle. The risk is that if `scanDir` produces slugs with trailing slashes or double slashes (e.g., if a directory entry has a trailing separator), the `path.join` produces a path like `docs-pages/developer/api//authentication.js`, which may or may not resolve correctly depending on the OS, and the glob key in `contentModules` will not match.

**Warning signs:**
- On some systems, a slug like `developer/api/authentication` produces a file at `docs-pages/developer/api/authentication.js` but the glob key is `../../data/docs-pages/developer/api/authentication.js` (which matches). If a trailing slash appears, the key becomes `../../data/docs-pages/developer/api//authentication.js` and lookup returns `undefined`.
- Build succeeds but content is empty for one specific nested page while others work.

**Prevention strategy:**
- Normalize slugs immediately after construction in `scanDir`: replace backslashes with forward-slash and remove any double-slashes and leading/trailing slashes: `slug.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\/|\/$/g, "")`.
- Add a test case in `build.test.ts` that builds with a docs fixture containing a 3-level nested file and asserts: (a) the `.js` file exists at the correct path, (b) the slug has no double-slashes or trailing slashes.

**Phase:** Markdown loader (`src/markdown/loader.ts`). Address as part of the slug normalization pass.

---

## P11 — Pagefind indexes `<title>` tag instead of page H1, producing low-quality search results for nested pages

**What goes wrong:** Pagefind crawls the built HTML and indexes the `<title>` element for the page title in search results. Currently, the `<title>` is set by SolidStart's document head metadata — and there is currently no per-page `<title>` injection in `[...path].tsx` (the route file renders `<Shell>` but does not call `useHead` or set a `<title>`). Pagefind will fall back to the `<title>` set at the root `app.tsx` level (the site title), producing identical titles for all doc pages in search results. When content-derived H1 titles are introduced, the disconnect between the H1 (accurate, content-derived) and the `<title>` (generic site name) makes search results uninformative.

**Warning signs:**
- All doc page search results show the same title (the site title, e.g., "Carl API").
- Pagefind's result snippet shows correct content but no distinguishing title.
- On inspecting the built HTML, `<title>` tags on all doc pages are identical.

**Prevention strategy:**
- Add per-page `<title>` injection in `[...path].tsx` using SolidStart's `<Title>` component from `@solidjs/meta` (or equivalent). Set it to `${page().title} — ${siteConfig.title}`.
- Verify that the built HTML files for each doc page contain unique `<title>` values by adding a post-build assertion to `build.ts`.
- This is separate from the H1 derivation task but must be addressed in the same phase to avoid regressions.

**Phase:** Doc page route (`src/site/src/routes/docs/[...path].tsx`) and search indexing step. Address when content-derived titles are implemented.

---

## P12 — Backward compatibility: flat docs without folder structure break when loader sorting changes

**What goes wrong:** The current loader sorts pages by `category` (from frontmatter), then `order`, then `title`. The new folder-based hierarchy uses the directory path as the grouping mechanism instead of the `category` frontmatter field. If the loader changes its sorting logic for folder-based pages but flat (root-level) pages still rely on `category` frontmatter, there will be mixed behavior: flat pages are sorted by `category` and folder pages are sorted by directory. When both types coexist in the same docs directory (a realistic migration state), the sidebar order will be inconsistent and hard to predict.

**Warning signs:**
- After restructuring some docs into folders and leaving others flat, the flat pages appear in an unexpected position in the sidebar (not before or after the folder groups as intended).
- The `buildNavigationManifest` function produces a different section structure than what `PROJECT.md` describes (product docs and developer docs as distinct sections).

**Prevention strategy:**
- Define the sorting rules explicitly and document them: folder-based hierarchy takes precedence for sidebar section placement; within a folder, `order` frontmatter sorts pages; at the root level, `order` and `title` sort flat pages.
- Keep the existing `category` field as a no-op for folder-based pages (ignore it in manifest building for slugs with directory separators). This maintains backward compatibility without requiring frontmatter changes.
- Add a test that mixes flat pages and 3-level nested pages in the same fixture and asserts the resulting manifest item order matches the documented sort rules.

**Phase:** Navigation manifest builder (`src/cli/build.ts`, `buildNavigationManifest` function). Address when folder-based hierarchy is introduced.


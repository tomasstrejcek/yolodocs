---
phase: 02-flat-html-output
verified: 2026-02-20T14:17:30Z
status: passed
score: 8/8 must-haves verified
re_verification: false
---

# Phase 2: Flat HTML Output Verification Report

**Phase Goal:** Prerender produces flat `.html` files and all doc links use `.html`-suffixed paths that work on GCS/S3 without URL rewriting
**Verified:** 2026-02-20T14:17:30Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth                                                                              | Status     | Evidence                                                                                     |
|----|------------------------------------------------------------------------------------|------------|----------------------------------------------------------------------------------------------|
| 1  | All doc anchor URLs in the navigation manifest end with `.html`                    | VERIFIED   | `build.ts` lines 302, 321, 339: `` `${base}/docs/${p.slug}.html` `` at all three emit sites |
| 2  | Nitro prerender config has `autoSubfolderIndex` set to `false`                     | VERIFIED   | `app.config.ts` line 31: `autoSubfolderIndex: false`                                         |
| 3  | All existing `buildNavigationManifest` tests pass with `.html`-suffixed anchors    | VERIFIED   | `npm test`: 58 tests passed (2 test files), 0 failures                                       |
| 4  | Schema section anchors (hash-based) remain unchanged                               | VERIFIED   | `build.ts` lines 360, 373, 399, 412: all schema anchors use `#query-`, `#mutation-`, etc.    |
| 5  | Sidebar active state works when browser URL contains `.html` extension             | VERIFIED   | `Sidebar.tsx` line 43: `rawSlug.endsWith(".html") ? rawSlug.slice(0, -5) : rawSlug`          |
| 6  | Doc page lookup succeeds when `params.path` contains `.html` extension             | VERIFIED   | `[...path].tsx` line 27: `raw.endsWith(".html") ? raw.slice(0, -5) : raw`                   |
| 7  | WelcomePage Guides card links to a `.html`-suffixed doc URL                        | VERIFIED   | `WelcomePage.tsx` line 130: `` `/docs/${...slug...}.html` ``                                 |
| 8  | All three `.html` stripping points handle the no-extension case gracefully         | VERIFIED   | Both `endsWith(".html")` guards return the raw value unchanged when extension is absent       |

**Score:** 8/8 truths verified

---

### Required Artifacts

| Artifact                                             | Expected                                     | Status     | Details                                                                 |
|------------------------------------------------------|----------------------------------------------|------------|-------------------------------------------------------------------------|
| `src/site/app.config.ts`                             | Nitro flat prerender config                  | VERIFIED   | Contains `autoSubfolderIndex: false` at line 31                         |
| `src/cli/build.ts`                                   | Doc anchor URLs with `.html` extension       | VERIFIED   | `.html` appended in 3 anchor template literals (lines 302, 321, 339)    |
| `src/cli/build.test.ts`                              | Updated anchor assertions with `.html`       | VERIFIED   | 5 assertions updated; all 58 tests pass                                 |
| `src/site/src/components/layout/Sidebar.tsx`         | `.html` stripping in active state derivation | VERIFIED   | `endsWith(".html")` guard at line 43 in `derivedActiveId`               |
| `src/site/src/routes/docs/[...path].tsx`             | `.html` stripping in slug memo for page lookup | VERIFIED  | `endsWith(".html")` guard at line 27 in `slug` createMemo               |
| `src/site/src/components/welcome/WelcomePage.tsx`    | `.html` suffix on Guides card href           | VERIFIED   | `.html` appended at line 130 in Guides `CategoryCard` href              |

---

### Key Link Verification

| From                             | To                              | Via                                                                           | Status   | Details                                                                                  |
|----------------------------------|---------------------------------|-------------------------------------------------------------------------------|----------|------------------------------------------------------------------------------------------|
| `src/cli/build.ts`               | `src/site/app.config.ts`        | Anchor format matches flat file output naming                                 | WIRED    | Anchors use `.html`; Nitro produces `slug.html` files via `autoSubfolderIndex: false`    |
| `src/cli/build.test.ts`          | `src/cli/build.ts`              | Test assertions verify anchor format                                          | WIRED    | 5 assertions use `expect(item.anchor).toBe("/docs/....html")`; all pass                  |
| `Sidebar.tsx`                    | `manifest.json` anchors         | `derivedActiveId` strips `.html` from pathname to match `doc-{slug}` item ids | WIRED    | Line 42-44: `rawSlug.endsWith(".html") ? rawSlug.slice(0, -5) : rawSlug`                |
| `[...path].tsx`                  | `docs-manifest.json` slugs      | Slug memo strips `.html` from `params.path` to match `page.slug`             | WIRED    | Line 25-28: createMemo strips `.html` before `docsManifest.pages.find(p.slug === slug())`|
| `WelcomePage.tsx`                | Flat HTML output files          | Guides card href includes `.html` matching actual file name                  | WIRED    | Line 130: `` `/docs/${slug}.html` ``                                                     |

---

### Requirements Coverage

| Requirement | Plan    | Description                                                                           | Status    | Evidence                                                                                                        |
|-------------|---------|--------------------------------------------------------------------------------------|-----------|-----------------------------------------------------------------------------------------------------------------|
| HOST-01     | 02-01   | Prerender output produces flat HTML files (`architecture.html` not `architecture/index.html`) | SATISFIED | `autoSubfolderIndex: false` in `app.config.ts` line 31; this Nitro setting produces `slug.html` flat files     |
| HOST-02     | 02-01   | Direct URL access works on GCS/S3 without clean-URL resolution or server-side rewrites | SATISFIED | Flat `.html` files require no URL rewriting; files named by slug directly                                       |
| HOST-03     | 02-01   | Sidebar anchor hrefs match the flat HTML file paths                                   | SATISFIED | All three `buildNavigationManifest` emit sites append `.html` to doc anchors (build.ts lines 302, 321, 339)     |
| HOST-04     | 02-02   | Active state derivation handles `.html` extension in URL pathname                     | SATISFIED | `Sidebar.tsx` line 43 strips `.html` before `doc-${slug}` comparison; `[...path].tsx` line 27 strips for lookup |

All four requirements declared in plan frontmatter are accounted for. REQUIREMENTS.md Traceability table marks all four HOST-0x as Phase 2 / Complete. No orphaned requirements detected.

---

### Anti-Patterns Found

None. No `TODO`, `FIXME`, `PLACEHOLDER`, `return null`, empty handler bodies, or stub implementations were found in any of the six modified files.

---

### Human Verification Required

The following items cannot be verified programmatically and require a manual integration build + browser test if desired:

**1. Flat output file structure on full build**

- **Test:** Run `rm -rf test-output && node dist/bin/yolodocs.js --schema schema.graphql --output test-output --title "Carl API" --docs-dir ./docs`, then `ls test-output/docs/`
- **Expected:** Files named `getting-started.html`, `authentication.html`, etc. — no `getting-started/index.html` directories
- **Why human:** Integration build takes ~5 min and requires full SolidStart/Nitro pipeline. The unit tests, source grep, and Nitro flag verify the mechanism; end-to-end output requires running the full build.

**2. Active sidebar state on static host**

- **Test:** Deploy output to a bucket (or serve flat files locally), navigate to `getting-started.html` directly in browser
- **Expected:** Sidebar highlights "Getting Started" entry correctly
- **Why human:** Requires browser + real `.html` URL in address bar to exercise the `endsWith(".html")` path in `Sidebar.tsx`.

Note: The SUMMARY.md for plan 02-02 documents that the integration build was already run during execution and produced flat `.html` files. That execution evidence, combined with the source-level verification above, gives high confidence of correctness.

---

### Gaps Summary

No gaps. All eight observable truths are VERIFIED. All six required artifacts exist, are substantive (not stubs), and are correctly wired. All four HOST requirements are satisfied by implementation evidence. Dist/ contains the compiled output reflecting all changes (verified via `dist/src/cli/build.js` lines 225, 241, 258). Commit history confirms both plans were committed atomically with correct TDD flow (RED commit `135a5f3` before GREEN commit `b97da51`, then `c1a23ee` and `907570f` for plan 02-02).

---

_Verified: 2026-02-20T14:17:30Z_
_Verifier: Claude (gsd-verifier)_

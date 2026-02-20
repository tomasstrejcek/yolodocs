# Codebase Concerns

**Analysis Date:** 2026-02-20

## Tech Debt

**Pervasive use of `any` type assertions:**
- Issue: Type safety is bypassed in multiple critical data loading paths using `(data as any)` casts instead of proper type definitions
- Files: `src/site/app.config.ts:19`, `src/site/src/app.tsx:10`, `src/site/src/components/welcome/WelcomePage.tsx:9-11`, `src/site/src/components/search/SearchDialog.tsx:21`, `src/site/src/components/examples/PlaygroundToggle.tsx:19,39`, `src/site/src/components/reference/TypeLink.tsx:14,40-48,52-58`
- Impact: Imported JSON data (manifest, schema, config) lacks type checking at runtime. If data structure changes or is malformed, errors surface at render time, not load time
- Fix approach: Create type definition files for imported JSON (manifest.d.ts, schema.d.ts, site-config.d.ts) with Zod validation at entry points, similar to how config is handled in `src/cli/config.ts`

**Untyped error handling in build orchestration:**
- Issue: `catch (err: any)` at line 153 in `src/cli/build.ts` swallows error type information
- Files: `src/cli/build.ts:153`
- Impact: Can't distinguish between different error types (build failures, IO errors, permission issues)
- Fix approach: Catch specific error types or cast to `Error` class and check properties

**Missing null coalescing for schema lookups:**
- Issue: Multiple nested lookups in `src/site/src/components/reference/TypeLink.tsx:39-60` perform repeated `.some()` searches without memoization
- Files: `src/site/src/components/reference/TypeLink.tsx:39-60`
- Impact: Every type link render triggers O(n) searches across the entire type map. With schemas containing 100+ types, this creates unnecessary render-time overhead
- Fix approach: Build a Set of linkable type names at module load time, or use useMemo equivalent in Solid.js

**Incomplete error message context in build failures:**
- Issue: SolidStart build failures at `src/cli/build.ts:154-157` throw generic "SolidStart build failed" without preserving the actual error
- Files: `src/cli/build.ts:154-157`
- Impact: Users cannot debug build issues without re-running with YOLODOCS_DEBUG=1
- Fix approach: Include original error output in thrown Error message

## Known Bugs

**Build directory debug cleanup inconsistent:**
- Symptoms: When YOLODOCS_DEBUG=1, build dir persists; when false, it's deleted. If build partially fails, debug dir may not be available for inspection when needed
- Files: `src/cli/build.ts:206-210`
- Trigger: Run with `YOLODOCS_DEBUG=1`, then change it to unset and rerun — intermediate state unclear
- Workaround: Always set YOLODOCS_DEBUG=1 explicitly to keep build dirs around for inspection

**Introspection header env var resolution fails silently:**
- Symptoms: If introspection headers contain `${VAR_NAME}` placeholders for non-existent env vars, they silently resolve to empty strings instead of warning
- Files: `src/schema/introspection.ts:53-56`
- Trigger: Set `introspectionHeaders: {Authorization: "${API_TOKEN}"}` but API_TOKEN is not in environment
- Impact: Introspection request silently fails auth, returning 401/403 with unclear error
- Workaround: Validate env vars exist before running build

**JSON.parse of config file without error context:**
- Symptoms: If `yolodocs.config.json` is malformed, JSON.parse throws SyntaxError but no file context shown
- Files: `src/cli/config.ts:57`
- Trigger: Create invalid JSON in config file
- Workaround: Use YAML config format which provides better error messages

## Security Considerations

**Environment variables in introspection headers not validated:**
- Risk: If introspection headers are logged/printed anywhere before reaching the endpoint, auth tokens leak
- Files: `src/schema/introspection.ts:14-26`, `src/cli/config.ts:67-76`
- Current mitigation: Headers are only used in fetch, not logged in CLI output. But no explicit sanitization
- Recommendations: Add a "secret" marker in config schema for sensitive headers; never log them even in debug mode

**File path traversal in docs loader:**
- Risk: `scanDocsFolder` in `src/markdown/loader.ts` recursively reads all files matching `.md|.mdx` without path validation
- Files: `src/markdown/loader.ts:25-57`
- Current mitigation: Only reads from configured docsDir relative to cwd
- Recommendations: Validate that resolved paths stay within docsDir boundary (prevent `../` escapes)

**Dynamic code execution via execSync:**
- Risk: Multiple `execSync` calls in build pipeline could be vulnerable if command strings are constructed from untrusted input
- Files: `src/cli/build.ts:147`, `src/cli/build.ts:152`, `src/cli/build.ts:196`, `src/cli/build.ts:439`, `src/cli/build.ts:442`, `src/cli/build.ts:461`
- Current mitigation: Commands are hardcoded, no user input in shell strings
- Recommendations: Document and review this assumption; consider using spawn with array args instead of execSync where possible

## Performance Bottlenecks

**Example generation with unbounded recursion:**
- Problem: Auto-generating examples for deeply nested schemas can produce massive JSON payloads
- Files: `src/schema/examples.ts:110-172`, `src/schema/examples.ts:174-201`
- Cause: Recursion stops at `maxDepth` but still generates mock values for all fields at each level. With 50-field types and depth 3, this is 50^3 fields
- Impact: Generated examples.json can balloon to megabytes; site bundle gets large
- Improvement path: Add field count limit per level, not just depth; implement smart field selection (only scalar-heavy fields)

**Type linkability check is O(n) per render:**
- Problem: `isLinkableType()` in `src/site/src/components/reference/TypeLink.tsx:39-48` does .some() across all types/enums/interfaces/unions/inputs/scalars
- Files: `src/site/src/components/reference/TypeLink.tsx:39-48`
- Cause: No caching of type name lookup set
- Impact: Type field renders with many type references will be slow (hundreds of lookups × schema size)
- Improvement path: Precompute a Set of linkable names at module init; memoize with Solid's createMemo

**Build step copies entire site template including node_modules:**
- Problem: Filter at `src/cli/build.ts:68-71` excludes node_modules/`.vinxi` but only after copy starts
- Files: `src/cli/build.ts:66-72`
- Cause: fse.copySync is called before the filter is applied
- Impact: For large monorepos, initial copy is slow
- Improvement path: Pre-filter the readdir instead of filtering during copy

**Sidebar hash/click listening without debouncing:**
- Problem: Click listener in `src/site/src/components/layout/Sidebar.tsx:28` fires setTimeout on every click, even outside nav
- Files: `src/site/src/components/layout/Sidebar.tsx:24-34`
- Cause: Global click handler updates hash without scoping
- Impact: On document with many clickable elements, excessive hash updates and re-renders
- Improvement path: Only listen for clicks on nav items; debounce hash updates

## Fragile Areas

**Build system depends on Nitro prerender details:**
- Files: `src/cli/build.ts:98-106`, test at `src/cli/build.test.ts:14`
- Why fragile: Doc content is split into individual `.js` modules to work around Nitro JSON corruption. If Nitro's bundler changes or the workaround is removed, prerender fails silently with zero HTML files. This happened in production (PR #13)
- Safe modification: Any change to how doc content is stored must preserve the individual-file pattern; add regression tests
- Test coverage: `src/cli/build.test.ts` has specific regression test for this

**Example generation logic for nested types:**
- Files: `src/schema/examples.ts:100-241`
- Why fragile: Complex conditional logic for when to recurse vs. stop at scalars. Nested if/else at depth with multiple map branches (lines 117-136, 147-167). Hard to reason about interaction between depth limit, scalar detection, and field slicing
- Safe modification: Add unit tests for specific schema shapes (circular references, deeply nested unions, nullable wrappers); test with maxDepth=0,1,2,3
- Test coverage: No specific tests for example generation logic currently

**Type reference rendering and anchor generation:**
- Files: `src/site/src/components/reference/TypeLink.tsx:39-60`
- Why fragile: `isLinkableType()` and `getTypeAnchor()` both do the same six-part search. If one is updated but not the other, links break. Naming convention for anchors (`type-${name}`, `enum-${name}`, etc.) is hardcoded in multiple places
- Safe modification: Extract anchor naming to a single function; generate anchor map at boot
- Test coverage: No tests for TypeLink component or anchor generation

**Markdown doc loader with silent fallbacks:**
- Files: `src/markdown/loader.ts:48-51`
- Why fragile: Falls back to filename if title frontmatter is missing, and defaults category to "General" and order to 999. Changes to these defaults silently reorder docs
- Safe modification: Require title in frontmatter (validate with Zod), fail build if missing
- Test coverage: No tests for doc loading

## Scaling Limits

**Schema size and example generation memory:**
- Current capacity: Tested with ~43 queries, 45 mutations, 89 types (from schema.graphql)
- Limit: Example generation creates one example per operation × depth recursion. With 200 operations and maxDepth 3, and types with 20+ fields each, examples.json alone can exceed 5-10MB
- Scaling path: Implement field count limits in example generation; add `--max-example-fields` config; stream large examples instead of bundling

**Site nav sidebar with 1000+ items:**
- Current capacity: Sidebar renders a flat list per section with For loops
- Limit: No virtualization. If schema has 500 types + 500 custom docs + operations, sidebar DOM grows to 2000+ nodes. First render and search both O(n)
- Scaling path: Add virtual scrolling to sidebar; implement search index pre-computation

**Introspection URL timeout:**
- Current capacity: fetch() with default Node timeout (unlimited)
- Limit: Introspection queries on large schemas can take 30+ seconds. No timeout specified
- Scaling path: Add configurable `--introspection-timeout` flag; implement retry logic

## Dependencies at Risk

**Marked v14 with non-standard API:**
- Risk: `renderer.code` expects `({ text, lang })` object parameter (non-standard). Major versions may change this
- Impact: Custom code block rendering in `src/site/src/components/markdown/MarkdownPage.tsx` would break
- Migration plan: Pin marked to v14 explicitly; add integration test that custom code blocks work; watch for v15 migration guide

**fs-extra without TypeScript support in newer versions:**
- Risk: fs-extra is an older package; modern Node.js ships most fs-extra methods natively
- Impact: TypeScript @types/fs-extra may diverge from actual types
- Migration plan: Plan gradual migration to Node.js native fs.promises API; this is non-urgent

## Missing Critical Features

**No schema validation before build:**
- Problem: If schema file is invalid SDL, error occurs deep in buildSchema() call with cryptic graphql-js error
- Blocks: Can't provide user-friendly error messages early in the pipeline
- Impact: Users encounter generic parser errors instead of helpful guidance
- Fix: Add explicit SDL parse validation before extractSchema()

**No support for schema composition (federation):**
- Problem: Single schema-from-file only. No support for Apollo Federation subgraphs
- Blocks: Teams using federated schemas can't document individual services
- Impact: Users must manually merge schemas before building docs
- Fix: Add multi-schema input support; document composition requirements

**No diff/change tracking for schema versions:**
- Problem: Each build is independent; no way to see what changed from previous docs version
- Blocks: Can't document breaking changes or deprecations across versions
- Impact: Users must manually track schema changes
- Fix: Optional: store schema hash in output; on rebuild, compare and highlight changes

## Test Coverage Gaps

**Example generation logic:**
- What's not tested: Type recursion limits, scalar vs object detection, list/non-null wrapper handling
- Files: `src/schema/examples.ts`
- Risk: Complex nested-type logic could silently fail for unusual schema shapes (unions of interfaces, circular refs via interfaces)
- Priority: Medium

**Type anchor generation:**
- What's not tested: Edge cases like type names with special characters, duplicate detection, anchor format consistency
- Files: `src/site/src/components/reference/TypeLink.tsx:51-60`
- Risk: Links could silently fail if anchor format is inconsistent with definition locations
- Priority: Medium

**Build file I/O error handling:**
- What's not tested: Permission errors on output dir, disk full scenarios, symlink edge cases
- Files: `src/cli/build.ts:67-72`, `src/cli/build.ts:77-122`
- Risk: Build fails without clear error message in CI/CD environments with unusual mount/permission setups
- Priority: Low

**SearchDialog result ranking:**
- What's not tested: Query sorting logic (exact prefix vs contains), multi-word queries, special character escaping
- Files: `src/site/src/components/search/SearchDialog.tsx:50-56`
- Risk: Search results could have unintuitive ranking; no tests validate sort order
- Priority: Low

**Sidebar active state derivation:**
- What's not tested: Hash update detection, pathname extraction for docs, edge cases with base path
- Files: `src/site/src/components/layout/Sidebar.tsx:36-49`
- Risk: Active nav item could be wrong in subpath deployments or after rapid navigation
- Priority: Medium

---

*Concerns audit: 2026-02-20*

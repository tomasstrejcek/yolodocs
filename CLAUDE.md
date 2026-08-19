# CLAUDE.md

## Commands

```bash
pnpm run build           # compile TypeScript -> dist/ (must commit dist/)
pnpm run dev             # watch mode
pnpm test                # vitest (src/**/*.test.ts)
pnpm run lint            # oxlint src/ bin/
pnpm run format          # oxfmt src/ bin/
pnpm run format:check    # check formatting without writing
```

```bash
# Integration test (end-to-end build with real schema):
rm -rf test-output && node dist/bin/yolodocs.js --schema schema.graphql --output test-output --title "Carl API" --docs-dir ./docs
# Preview: npx serve test-output -p 3456
```

## Rules

- After changing any file in `src/`, run `pnpm test && pnpm run build` before committing.
- Commit `dist/` alongside source changes -- it is the published artifact.
- Every user-facing change (new CLI option, new config field, changed behavior) MUST be reflected in README.md before committing.
- Always branch off main. Never push directly to main.

## Structure

```
bin/yolodocs.ts          CLI entry point
src/cli/                 Build orchestration (build.ts, config.ts, index.ts)
src/schema/              Schema parsing (parser.ts, types.ts, examples.ts, introspection.ts)
src/markdown/loader.ts   Custom docs scanner
src/site/                SolidStart app template (own tsconfig, own node_modules)
dist/                    Compiled output (committed to git for npx usage)
docs/                    Sample markdown docs (shipped as test fixtures)
```

## Gotchas

- Root tsconfig excludes `src/site/**` -- the site has its own tsconfig. Do not merge them.
- Site template path resolves from `dist/src/cli/` via `../../../src/site`. Do not restructure dist/ without updating this.
- When running via `npx github:...`, everything is under `node_modules/yolodocs/`. Use `path.relative()` before checking path segments -- never filter on absolute paths containing `node_modules`.
- `marked` v14 renderer.code uses `({ text, lang })` object param, not positional args.
- Use `pnpm run build` / `pnpm run dev` in `src/site/` to invoke vinxi, not direct binary paths.
- The internal CLI build still uses `npm install` inside the temp build dir (pnpm is not required on end-user machines).
- Never put build scratch files under the output dir. Pagefind indexes every `.html` under `--site`, so the old `<output>/.build-tmp` shipped a duplicate of every page (plus `node_modules` stray pages) as `/.build-tmp/.output/public/<slug>.html` results that 404. `createBuildDir()` keeps the scratch dir in `os.tmpdir()`.
- Anything the search index must not contain needs `data-pagefind-ignore` (chrome, footers, the not-found fallback); page content lives under the one `data-pagefind-body` on `<main>` in Shell.tsx. If no element on a page carries `data-pagefind-body`, Pagefind drops the page entirely.
- Anchor ids belong on the heading element, not a wrapper div -- Pagefind builds sub-results (the deep links search returns) from `h1`-`h6` that have an id.
- Doc page content is split into individual `.js` files (not inlined in docs-manifest.json) to avoid Nitro prerender corruption with large JSON modules.
- Those modules are written via `serializeDocPageModule` (src/cli/build.ts), never a bare `JSON.stringify`. Vite/vinxi and Nitro substitute `process.env.NODE_ENV` / `import.meta.env.*` textually, string literals included -- the serializer escapes those prefixes so a page that merely documents such a token does not get `"prerender"` injected mid-literal, which breaks the build with `Expected ";" but found "prerender"`.

# CLAUDE.md

## Commands

```bash
npm run build            # compile TypeScript -> dist/ (must commit dist/)
npm run dev              # watch mode
npm test                 # vitest (src/**/*.test.ts)
```

```bash
# Integration test (end-to-end build with real schema):
rm -rf test-output && node dist/bin/yolodocs.js --schema schema.graphql --output test-output --title "Carl API" --docs-dir ./docs
# Preview: npx serve test-output -p 3456
```

## Rules

- After changing any file in `src/`, run `npm test && npm run build` before committing.
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
- Use `npm run build` / `npm run dev` to invoke vinxi, not direct binary paths.
- Doc page content is split into individual `.js` files (not inlined in docs-manifest.json) to avoid Nitro prerender corruption with large JSON modules.

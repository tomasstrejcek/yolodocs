# Architecture

**Analysis Date:** 2026-02-20

## Pattern Overview

**Overall:** Multi-stage CLI-based build pipeline with schema parsing, data generation, and static site generation.

**Key Characteristics:**
- Command-line orchestration layer (Commander.js)
- Schema parsing and introspection (graphql-js)
- Static site templating (SolidStart with pre-rendered output)
- Markdown documentation scanning and integration
- Data-driven rendering (schema → JSON → static HTML)

## Layers

**CLI Layer:**
- Purpose: Command-line interface, option parsing, and build orchestration
- Location: `src/cli/`
- Contains: Command definition, configuration validation, build coordination
- Depends on: Schema parsers, markdown loader, site builder
- Used by: Entry point `bin/yolodocs.ts`, external users via npm

**Schema Layer:**
- Purpose: Parse GraphQL schemas and generate mock data/examples
- Location: `src/schema/`
- Contains: Schema extraction from SDL, introspection fetching, example generation
- Depends on: graphql-js library, fs
- Used by: Build layer, example generation for documentation

**Markdown/Docs Layer:**
- Purpose: Scan and parse custom markdown documentation
- Location: `src/markdown/`
- Contains: Recursive directory scanning, frontmatter parsing, slug generation
- Depends on: gray-matter, fs
- Used by: Build layer for navigation and content injection

**Site Template Layer:**
- Purpose: Pre-built SolidStart application that renders documentation
- Location: `src/site/`
- Contains: React-like components, routing, data loading
- Depends on: @solidjs/router, @solidjs/start, tailwindcss, vinxi
- Used by: Build process as template to be instantiated with data

## Data Flow

**Build Pipeline:**

1. **Schema Loading** (`build.ts` → `schema/parser.ts` or `schema/introspection.ts`)
   - Accept schema from: SDL file, HTTP introspection URL, or introspection JSON file
   - Output: `ParsedSchema` object containing queries, mutations, types, enums, interfaces, unions, inputs, scalars

2. **Example Generation** (`build.ts` → `schema/examples.ts`)
   - Input: `ParsedSchema`
   - Generates mock responses and operation examples for each query/mutation
   - Output: `ExampleData` with operation examples (query, variables, mock response)

3. **Docs Scanning** (`build.ts` → `markdown/loader.ts`)
   - Input: Docs directory path
   - Recursively finds `.md`/`.mdx` files, parses frontmatter (title, category, order)
   - Output: `DocsManifest` with pages metadata and content

4. **Navigation Building** (`build.ts` → `buildNavigationManifest()`)
   - Input: Schema + docs manifest + base path
   - Creates hierarchical navigation structure: docs sections first, then schema sections (queries, mutations, types, etc.)
   - Output: `NavigationManifest` with sidebar structure

5. **Site Template Instantiation** (`build.ts`)
   - Copy site template to build directory
   - Inject generated data files: `schema.json`, `manifest.json`, `examples.json`, `docs-manifest.json`, `docs-pages/*.js`, `site-config.json`
   - Store user assets (logo, favicon) in `public/`

6. **Build & Prerender** (`build.ts`)
   - Run `npm install` and `npm run build` in site directory
   - Vinxi compiles SolidStart app and Nitro performs static prerender
   - Output: HTML files in `.output/public/`

7. **Search Indexing** (`build.ts`)
   - Run pagefind on output directory
   - Generate search index at `_pagefind/`

8. **Output Transfer** (`build.ts`)
   - Copy `.output/public/` to user's output directory
   - Clean up build directory (unless `YOLODOCS_DEBUG=1`)

**State Management:**

- Configuration state: Loaded once at startup via `loadConfig()`, passed through build pipeline
- Schema state: Parsed once, used for examples and navigation
- Example state: Generated once per build, cached in `examples.json`
- Site state: Rendered to static HTML, no runtime state except client-side localStorage for settings (endpoint, auth token)

## Key Abstractions

**ParsedSchema:**
- Purpose: Normalized representation of GraphQL schema in JSON-serializable form
- Examples: `src/schema/types.ts`, output from `parseSchemaFromFile()`, `parseSchemaFromSDL()`
- Pattern: Discriminated type structure (queries, mutations, types, enums, interfaces, unions, inputs, scalars)

**TypeRef:**
- Purpose: Recursive type reference with modifiers (NON_NULL, LIST)
- Examples: `src/schema/types.ts`
- Pattern: Tree structure (`kind` + `ofType`) matching GraphQL type system

**NavigationManifest:**
- Purpose: Sidebar navigation structure derived from schema and docs
- Examples: Output from `buildNavigationManifest()` in `build.ts`
- Pattern: Sections containing items with optional children (for folder groups)

**DocsPage:**
- Purpose: Single custom documentation page with metadata and content
- Examples: `src/schema/types.ts`, output from `scanDocsFolder()` in `markdown/loader.ts`
- Pattern: slug-based routing with title, category, order for sorting

## Entry Points

**CLI Entry:**
- Location: `bin/yolodocs.ts`
- Triggers: `npm exec yolodocs [options]` or npx invocation
- Responsibilities: Parse process.argv, instantiate CLI, invoke build

**CLI Command Creation:**
- Location: `src/cli/index.ts` (`createCli()` function)
- Triggers: Called from bin/yolodocs.ts
- Responsibilities: Define command options (schema, output, docs-dir, title, etc.), attach action handler

**Build Orchestration:**
- Location: `src/cli/build.ts` (`build()` function)
- Triggers: CLI action handler invokes with validated config
- Responsibilities: Execute 5-step build pipeline (parse → generate → scan → manifest → build → index), handle errors, log progress

**Site Rendering:**
- Location: `src/site/src/app.tsx`
- Triggers: Prerender phase of vinxi build
- Responsibilities: Set up SolidStart router, load FileRoutes, set base path

**Index Route:**
- Location: `src/site/src/routes/index.tsx`
- Triggers: GET /
- Responsibilities: Render welcome page with schema overview

**Reference Route:**
- Location: `src/site/src/routes/reference.tsx`
- Triggers: GET /reference
- Responsibilities: Render all schema sections (queries, mutations, types, etc.)

**Docs Dynamic Route:**
- Location: `src/site/src/routes/docs/[...path].tsx`
- Triggers: GET /docs/:path
- Responsibilities: Load doc page content from `docs-pages/:slug.js`, render with MarkdownPage component

## Error Handling

**Strategy:** Fail-fast validation at CLI entry, descriptive error messages, exit code 1 on failure

**Patterns:**
- Configuration validation via Zod schema (`loadConfig()` in `config.ts`) - validates all options, provides detailed error messages
- File existence checks before operations (schema file, output directory)
- Schema parsing errors from graphql-js propagate with context
- Build errors from child processes (npm install, vinxi build) captured and logged
- HTML generation validation: checks for `.output/public` and `index.html` existence
- Graceful degradation: pagefind failures don't halt build, search indexing skipped

## Cross-Cutting Concerns

**Logging:** Console-based, structured as progress steps. Format: `[step/total] description` with sub-items indented

**Validation:**
- Config validation: Zod schema in `src/cli/config.ts`
- Schema source: At least one of schema/introspectionUrl/introspectionFile required
- File paths: Resolved relative to `process.cwd()`
- Base path: Normalized to start with `/` and have no trailing `/`

**Authentication:**
- GraphQL endpoint credentials via `--introspection-headers` (supports `${ENV_VAR}` substitution)
- Playground headers stored in `site-config.json` for client-side playground

**Path Resolution:**
- Site template path: Computed from `dist/src/cli/` up to project root via `path.resolve(__dirname, "../../../src/site")`
- Relative paths always resolved via `path.resolve(process.cwd(), userPath)`
- Glob paths use `import.meta.glob` in SolidStart for lazy-loading doc content

---

*Architecture analysis: 2026-02-20*

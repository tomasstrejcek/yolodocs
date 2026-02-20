# Codebase Structure

**Analysis Date:** 2026-02-20

## Directory Layout

```
yolodocs/
├── bin/
│   └── yolodocs.ts              # CLI entry point
├── src/
│   ├── index.ts                 # Public API exports
│   ├── cli/
│   │   ├── index.ts             # CLI command creation
│   │   ├── config.ts            # Configuration validation & loading
│   │   └── build.ts             # Build orchestration (5-step pipeline)
│   ├── schema/
│   │   ├── parser.ts            # SDL → ParsedSchema conversion
│   │   ├── types.ts             # Type definitions (ParsedSchema, TypeRef, etc.)
│   │   ├── examples.ts          # Mock data & operation example generation
│   │   └── introspection.ts     # HTTP introspection & file loading
│   ├── markdown/
│   │   └── loader.ts            # Recursive docs scanning & frontmatter parsing
│   └── site/                    # SolidStart template (separate tsconfig, node_modules)
│       ├── tsconfig.json        # Site-specific TypeScript config
│       ├── package.json         # Site dependencies (SolidStart, Tailwind, Vinxi)
│       ├── app.config.ts        # Vinxi/SolidStart config
│       ├── src/
│       │   ├── app.tsx          # Root SolidStart app with router
│       │   ├── entry-client.tsx # Client entry point
│       │   ├── app.css          # Global styles
│       │   ├── data/
│       │   │   ├── schema.json          # Injected ParsedSchema
│       │   │   ├── manifest.json        # Injected NavigationManifest
│       │   │   ├── examples.json        # Injected ExampleData
│       │   │   ├── docs-manifest.json   # Injected docs metadata (no content)
│       │   │   ├── docs-pages/          # Individual doc page content .js files
│       │   │   └── site-config.json     # Injected SiteConfig
│       │   ├── components/
│       │   │   ├── layout/
│       │   │   │   ├── Shell.tsx        # Main app layout wrapper
│       │   │   │   ├── Sidebar.tsx      # Navigation sidebar
│       │   │   │   ├── MobileNav.tsx    # Mobile menu
│       │   │   │   └── SettingsPanel.tsx # Endpoint/token settings
│       │   │   ├── reference/
│       │   │   │   ├── QuerySection.tsx      # Query operation display
│       │   │   │   ├── MutationSection.tsx   # Mutation operation display
│       │   │   │   ├── TypeSection.tsx       # Object type display
│       │   │   │   ├── EnumSection.tsx       # Enum display
│       │   │   │   ├── InterfaceSection.tsx  # Interface display
│       │   │   │   ├── UnionSection.tsx      # Union display
│       │   │   │   ├── InputSection.tsx      # Input object display
│       │   │   │   ├── ScalarSection.tsx     # Scalar display
│       │   │   │   ├── FieldTable.tsx        # Reusable field listing
│       │   │   │   ├── TypeBadge.tsx         # Type kind badge
│       │   │   │   ├── TypeLink.tsx          # Clickable type reference
│       │   │   │   ├── DeprecationBadge.tsx  # Deprecation indicator
│       │   │   │   ├── DescriptionBlock.tsx  # Formatted descriptions
│       │   │   │   ├── OperationNav.tsx      # Operation list navigation
│       │   │   ├── examples/
│       │   │   │   ├── ExamplePanel.tsx     # Example display
│       │   │   │   ├── QueryEditor.tsx      # GraphQL editor
│       │   │   │   ├── CodeBlock.tsx        # Syntax-highlighted code
│       │   │   │   └── PlaygroundToggle.tsx # Switch example/playground
│       │   │   ├── search/
│       │   │   │   ├── SearchDialog.tsx    # Search modal
│       │   │   │   └── SearchResults.tsx   # Search result list
│       │   │   ├── markdown/
│       │   │   │   └── MarkdownPage.tsx    # Render markdown with custom marked renderer
│       │   │   └── welcome/
│       │   │       ├── WelcomePage.tsx     # Home page with schema overview
│       │   │       └── CategoryCard.tsx    # Category summary cards
│       │   ├── lib/
│       │   │   ├── syntax.ts       # Token-based GraphQL/JSON syntax highlighter
│       │   │   ├── auth-store.ts   # localStorage for endpoint & auth token
│       │   │   └── base-path.ts    # Base path helper for routing with base prefix
│       │   └── routes/
│       │       ├── index.tsx       # Home page route
│       │       ├── reference.tsx   # Schema reference page route
│       │       └── docs/
│       │           └── [...path].tsx # Dynamic doc pages route
│       └── public/                 # Static assets (copied at build time)
│           ├── logo.*              # User logo
│           └── favicon.*           # User favicon
├── docs/                          # Sample/test markdown docs
│   ├── getting-started.md
│   ├── authentication.md
│   ├── pagination.md
│   └── error-handling.md
├── dist/                          # Compiled JavaScript output (committed to git)
├── test/                          # Test fixtures
├── tsconfig.json                  # Root TypeScript config (excludes src/site/**)
├── vitest.config.ts               # Test runner config
├── package.json                   # CLI dependencies & scripts
├── README.md                      # User documentation
└── CLAUDE.md                      # Developer instructions
```

## Directory Purposes

**bin/**
- Purpose: Executable entry point for CLI
- Contains: Single `.ts` file that imports and instantiates CLI
- Key files: `yolodocs.ts`

**src/cli/**
- Purpose: CLI orchestration and build pipeline
- Contains: Command definition, config validation, build coordination
- Key files: `index.ts` (CLI setup), `config.ts` (Zod validation), `build.ts` (5-step pipeline)

**src/schema/**
- Purpose: GraphQL schema parsing and processing
- Contains: SDL/introspection parsing, type extraction, mock data generation
- Key files: `parser.ts` (schema extraction), `types.ts` (TS interfaces), `examples.ts` (mocks), `introspection.ts` (HTTP/file loading)

**src/markdown/**
- Purpose: Custom documentation scanning
- Contains: Recursive file scanning, frontmatter parsing, slug generation
- Key files: `loader.ts`

**src/site/**
- Purpose: SolidStart template application (copied during build)
- Contains: Routes, components, data loaders, styling
- Key files: `app.tsx` (root), `src/routes/*` (pages), `src/components/*` (UI)

**src/site/src/data/**
- Purpose: Placeholder JSON files overwritten with generated data during build
- Contains: Schema data, navigation manifest, examples, docs manifest, individual doc page content
- Key files: `schema.json`, `manifest.json`, `examples.json`, `docs-manifest.json`, `docs-pages/*.js`, `site-config.json`

**src/site/src/components/**
- Purpose: Reusable UI components organized by domain
- Contains: Reference sections, layout, search, examples, markdown rendering
- Subdirectories: `reference/` (schema display), `layout/` (Shell, Sidebar), `search/`, `examples/`, `markdown/`, `welcome/`

**src/site/src/lib/**
- Purpose: Utilities and shared logic
- Contains: Syntax highlighting, localStorage auth store, base path routing
- Key files: `syntax.ts`, `auth-store.ts`, `base-path.ts`

**src/site/src/routes/**
- Purpose: File-based routing for SolidStart
- Contains: Page components (index, reference, docs dynamic route)
- Key files: `index.tsx` (home), `reference.tsx` (schema), `docs/[...path].tsx` (doc pages)

**docs/**
- Purpose: Sample markdown documentation (shipped as test fixtures)
- Contains: `.md` files with frontmatter
- Key files: `getting-started.md`, `authentication.md`, `pagination.md`, `error-handling.md`

**dist/**
- Purpose: Compiled JavaScript output (published artifact, committed to git)
- Contains: Transpiled `.js` files mirroring `src/` structure
- Generated by: `npm run build` (TypeScript compilation)

**test/**
- Purpose: Test fixtures and data
- Contains: Sample schemas, test utilities

## Key File Locations

**Entry Points:**
- `bin/yolodocs.ts`: CLI executable entry point
- `src/cli/index.ts`: Command definition and option setup
- `src/cli/build.ts`: Main build pipeline orchestrator
- `src/site/src/app.tsx`: SolidStart app root with router

**Configuration:**
- `src/cli/config.ts`: Zod schema validation and config loading
- `src/site/app.config.ts`: Vinxi/SolidStart configuration
- `tsconfig.json`: Root TypeScript config (excludes site)
- `src/site/tsconfig.json`: Site-specific TypeScript config

**Core Logic:**
- `src/schema/parser.ts`: SDL → ParsedSchema conversion
- `src/schema/examples.ts`: Mock data and operation example generation
- `src/markdown/loader.ts`: Custom docs scanning and parsing
- `src/cli/build.ts`: Build pipeline (parse → generate → scan → build → index)

**Testing:**
- `src/cli/build.test.ts`: Regression tests for docs content splitting
- `vitest.config.ts`: Vitest configuration

**Type Definitions:**
- `src/schema/types.ts`: All TypeScript interfaces (ParsedSchema, NavigationManifest, DocsPage, etc.)
- `src/index.ts`: Public API exports

## Naming Conventions

**Files:**
- `.ts` for server/CLI code
- `.tsx` for React/SolidJS components
- `.test.ts` for test files (co-located with source)
- Kebab-case for file names: `schema-parser.ts` (NOT SchemaParser.ts)

**Directories:**
- Lowercase, plural when containing multiple items: `components/`, `routes/`, `lib/`
- Grouped by domain: `components/reference/`, `components/layout/`, `src/site/src/`

**Functions:**
- camelCase: `parseSchemaFromFile()`, `buildNavigationManifest()`, `generateExamples()`
- Async functions return Promise: `async function loadSchema()`

**Types/Interfaces:**
- PascalCase: `ParsedSchema`, `TypeRef`, `NavigationManifest`, `DocsPage`
- Suffix with Definition, Data, or Manifest: `FieldDefinition`, `ExampleData`, `NavigationManifest`

**Components:**
- PascalCase, match file name: file `QuerySection.tsx` exports `<QuerySection />`
- Suffix with Section, Panel, Dialog, Card: `QuerySection`, `SettingsPanel`, `SearchDialog`

**Constants:**
- UPPERCASE with underscore: `BUILT_IN_SCALARS`, `INTERNAL_TYPE_PREFIX`

## Where to Add New Code

**New Feature (e.g., custom operation grouping):**
- Primary code: `src/cli/build.ts` or `src/schema/` depending on scope
- Tests: `src/cli/build.test.ts` (co-located)
- Update config: `src/cli/config.ts` (add new option)
- CLI option: `src/cli/index.ts` (add to .option() chain)

**New Component/Module:**
- SolidJS UI: `src/site/src/components/` (organize by domain: reference/, layout/, etc.)
- Utilities: `src/site/src/lib/` (for shared logic)
- Routes: `src/site/src/routes/` (for new pages)
- Schema processing: `src/schema/` (for new type handling)

**Utilities:**
- Shared helpers: `src/site/src/lib/` (for client-side) or `src/` top-level (for CLI)
- GraphQL parsing helpers: `src/schema/`
- CLI helpers: `src/cli/`

**New Docs/Content:**
- Sample markdown: `docs/` (with YAML frontmatter: title, category, order)
- Must include `.yml`/`.yaml`/`.json` config file for schema: root-level `yolodocs.config.yml`

## Special Directories

**src/site/node_modules/**
- Purpose: Site-specific dependencies (SolidStart, Tailwind, Vinxi)
- Generated: Yes, by `npm install` in site directory
- Committed: No, in `.gitignore`
- Note: Root project has separate node_modules with CLI deps

**src/site/.vinxi/**
- Purpose: Vinxi build cache
- Generated: Yes, during `npm run build`
- Committed: No, filtered out during site copy
- Note: Explicitly excluded in build.ts during site copy

**dist/**
- Purpose: Compiled TypeScript output
- Generated: Yes, by `npm run build` (tsc)
- Committed: Yes, **must commit alongside source changes** for npx usage
- Note: This is the published artifact users consume via npx

**src/site/src/data/**
- Purpose: Placeholder JSON files overwritten during build
- Generated: Yes, by build pipeline
- Committed: Partial (placeholders exist, overwritten at runtime)
- Note: `docs-pages/*.js` generated per build, individual pages

---

*Structure analysis: 2026-02-20*

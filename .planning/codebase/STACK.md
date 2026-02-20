# Technology Stack

**Analysis Date:** 2026-02-20

## Languages

**Primary:**
- TypeScript 5.6.0 - Root CLI and schema processing (`bin/`, `src/cli/`, `src/schema/`, `src/markdown/`)
- TypeScript 5.6.0 - SolidStart site template with JSX (`src/site/src/`)

**Config:**
- YAML / JSON - Configuration files (`yolodocs.config.yml`, `yolodocs.config.json`)

## Runtime

**Environment:**
- Node.js (ES2022 target, no specific version pinned)

**Package Manager:**
- npm (lockfile: `package-lock.json` present)

## Frameworks

**Core CLI:**
- Commander.js 12.1.0 - CLI argument parsing and orchestration (`bin/yolodocs.ts`, `src/cli/index.ts`)

**Site Framework:**
- SolidStart 1.1.0 - Static preset, file-based routing with Router (`src/site/`)
- Solid.js 1.9.5 - Reactive UI components (`src/site/src/components/`)
- @solidjs/router 0.15.3 - File-based routing in `src/site/src/routes/`
- Vinxi 0.5.3 - Build system for SolidStart (`npm run build` via Vinxi)

**Styling:**
- Tailwind CSS 4.0.0 - Utility-first CSS in SolidStart site (`src/site/src/app.css`)
- @tailwindcss/vite 4.0.0 - Vite integration for Tailwind v4

## Key Dependencies

**Critical:**
- graphql 16.9.0 - GraphQL schema parsing, introspection query generation, schema building (`src/schema/parser.ts`, `src/schema/introspection.ts`)
- zod 3.23.0 - Configuration validation (`src/cli/config.ts` - validates CLI options and config files)
- marked 14.0.0 - Markdown parsing for custom docs AND site code block rendering (`src/markdown/loader.ts`, `src/site/src/`)

**Schema & Docs:**
- gray-matter 4.0.3 - YAML frontmatter parsing from markdown files (`src/markdown/loader.ts`)
- js-yaml 4.1.0 - YAML parsing for config files (`src/cli/config.ts`)

**File System:**
- fs-extra 11.2.0 - Enhanced file operations (copy, ensure dirs) (`src/cli/build.ts`)

**Search:**
- pagefind 1.3.0 - Client-side full-text search indexing (site dependency, runs at build time via `npm exec`)

## Build & Development

**Build:**
- TypeScript 5.6.0 - Root compiler (`npm run build` → `tsc`)
- Vinxi 0.5.3 - Metaframework build tool for SolidStart (invoked by `npm run build` in site dir)

**Development:**
- TypeScript 5.6.0 watch mode - Root (`npm run dev` → `tsc --watch`)
- Vinxi dev server - Hot reload for site template during dev builds

**Testing:**
- Vitest 4.0.18 - Test runner (`npm test` → `vitest run`, config: `vitest.config.ts`)

## Configuration

**Environment:**
- Configuration via CLI flags (primary): `-s/--schema`, `--introspection-url`, `--introspection-file`, `-o/--output`, `--title`, `--endpoint`, `--docs-dir`, `--base`, `-c/--config`
- Configuration via file (secondary): `yolodocs.config.yml` or `yolodocs.config.json` in project root (auto-detected)
- Environment variable interpolation: `${VAR_NAME}` syntax in introspection headers (`src/schema/introspection.ts`)

**Key configs required:**
- One of: `schema` (file path), `introspectionUrl` (endpoint), or `introspectionFile` (JSON file)
- Optional: `title`, `endpoint`, `docsDir`, `output`, `base`, `playgroundHeaders`

**Build:**
- Root TypeScript: `tsconfig.json` - ES2022 target, strict mode, module bundler resolution, excludes `src/site/**`
- Site TypeScript: `src/site/tsconfig.json` - ESNext target, JSX preservation, Solid.js JSX source, Vinxi types
- Site build: Vinxi config implicit in `src/site/` structure (routes in `src/site/src/routes/`, data in `src/site/src/data/`)

## Platform Requirements

**Development:**
- Node.js (ES2022+ support)
- npm package manager
- Local file system for schema input (GraphQL SDL file or introspection JSON)

**Production:**
- Static hosting only (HTML/CSS/JS output)
- No server-side runtime required
- Output is plain static files: `index.html`, `.output/public/` or similar depending on Vinxi output structure
- Pagefind index included in output (`_pagefind/` directory)

---

*Stack analysis: 2026-02-20*

# Coding Conventions

**Analysis Date:** 2026-02-20

## Naming Patterns

**Files:**
- Kebab-case for filenames: `build.ts`, `parser.ts`, `loader.ts`, `yolodocs.ts`
- Test files use `.test.ts` suffix: `build.test.ts`
- Types defined in separate files: `types.ts` for all type definitions
- Directory names are kebab-case: `src/cli/`, `src/schema/`, `src/markdown/`, `src/site/`

**Functions:**
- camelCase for all function names: `parseSchemaFromFile()`, `extractSchema()`, `scanDocsFolder()`
- Descriptive verb-based names: `extract*`, `parse*`, `generate*`, `load*`, `scan*`
- Private functions are explicitly declared: `extractTypeRef()`, `getTypeKind()`, `resolveEnvVars()`
- Async functions use async keyword: `async function loadSchema()`, `async function build()`

**Variables:**
- camelCase for all variables and constants: `schema`, `config`, `docsManifest`, `typeMap`
- Constants use UPPER_CASE: `BUILT_IN_SCALARS`, `INTERNAL_TYPE_PREFIX`, `SCALAR_MOCKS`
- Private class fields use underscore prefix: `this.typeMap`, `this.enumMap` (within classes)
- Map/Set variable names descriptive: `folderMap`, `rootTypeNames`, `typeMap`

**Types:**
- PascalCase for interfaces and type aliases: `ParsedSchema`, `FieldDefinition`, `TypeRef`, `YolodocsConfig`
- Suffix pattern used: `*Definition`, `*Manifest`, `*Example`, `*Schema`
- Type imports explicitly marked: `type ParsedSchema`, `type YolodocsConfig`

## Code Style

**Formatting:**
- No explicit formatter configured (ESLint/Prettier not in package.json)
- Uses TypeScript strict mode for consistency: `strict: true` in tsconfig.json
- Semicolons present throughout: standard JavaScript style
- 2-space indentation observed in code and JSON

**Linting:**
- No explicit linter found in package.json
- TypeScript compiler (`tsc`) used directly for type checking
- Strict tsconfig enforces type safety:
  - `strict: true`
  - `forceConsistentCasingInFileNames: true`
  - `isolatedModules: true`
  - `esModuleInterop: true`

## Import Organization

**Order:**
1. External node modules (graphql, fs-extra, js-yaml, etc.)
2. Node built-ins (node:fs, node:path, node:child_process)
3. Local imports with relative paths (./config.js, ../schema/parser.js)
4. Type-only imports marked explicitly: `import type { ... }`

**Pattern from `src/cli/build.ts`:**
```typescript
import fs from "node:fs";
import fse from "fs-extra";
import path from "node:path";
import { execSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { YolodocsConfig } from "./config.js";
import { parseSchemaFromFile, parseSchemaFromSDL } from "../schema/parser.js";
```

**Path Aliases:**
- No path aliases configured in tsconfig.json
- Uses relative paths: `../schema/parser.js`, `../schema/types.js`
- File extensions `.js` explicitly included in imports (ESM pattern)

## Error Handling

**Patterns:**
- Explicit error throwing with descriptive messages: `throw new Error("message")`
- Try-catch blocks only where recovery is attempted
- `console.error()` used to log errors before rethrowing
- Error messages are user-facing: includes context and suggestions

**Examples from `src/cli/build.ts`:**
```typescript
try {
  buildOutput = execSync("npm run build 2>&1", { cwd: buildDir, encoding: "utf-8" });
} catch (err: any) {
  console.error("\n        SolidStart build failed:");
  console.error(err.stdout || err.stderr || err.message);
  throw new Error("SolidStart build failed");
}
```

**Config validation uses Zod:**
- `SafeParse` returns `{ success, error, data }` object
- Error formatting: `result.error.issues.map(i => \`${i.path.join(".")}: ${i.message}\`)`
- Validation errors provide full context: path and message per field

## Logging

**Framework:** console
- `console.log()` for informational output with indentation: `console.log("  [step] message")`
- `console.error()` for error output
- Formatted output includes visual markers:
  - Step numbers: `[1/5]`, `[2/5]`, etc.
  - Indentation: 2-space prefix for clarity
  - Progress messages with counts

**Patterns from `src/cli/build.ts`:**
```typescript
console.log("\n  yolodocs - GraphQL Documentation Generator\n");
console.log("  [1/5] Parsing schema...");
console.log(`        ${schema.queries.length} queries, ${schema.mutations.length} mutations`);
console.log(`  Done! Output: ${outputDir}\n`);
```

## Comments

**When to Comment:**
- Complex algorithms or non-obvious logic receive comments
- Regression test comments explain the WHY: see `src/cli/build.test.ts` for multi-line comments explaining Nitro prerender JSON corruption issue
- JSDoc comments minimal - only on public API exports

**Pattern from `src/cli/build.test.ts`:**
```typescript
/**
 * Regression test for Nitro prerender JSON corruption.
 * When all doc page content was bundled into a single docs-manifest.json,
 * Nitro's prerender bundler would corrupt the JSON.parse() serialization...
 */
```

## Function Design

**Size:**
- Small focused functions: `extractField()`, `getTypeKind()`, `unwrapType()` 10-20 lines
- Larger orchestration functions acceptable: `build()` 200 lines with clear step comments
- Helper functions extracted when used 2+ times: `unwrapType()`, `isList()`, `stripList()`

**Parameters:**
- Single object parameter preferred for config: `loadConfig(cliOptions)`
- Type annotations required for all parameters
- Destructuring used in function signatures: `({ content, ...meta }) => meta`

**Return Values:**
- Explicit return types on all public functions: `Promise<void>`, `ParsedSchema`, `NavigationManifest`
- Null vs undefined: uses `null` explicitly for "no value": `type: string | null`, `ofType: TypeRef | null`
- Maps/Sets returned as generic types: `Map<string, TypeDefinition>`

## Module Design

**Exports:**
- Named exports preferred over default exports
- Public API barrel file `src/index.ts` re-exports key functions: `parseSchemaFromFile`, `generateExamples`, `scanDocsFolder`
- Type exports using `export type *`: `export type * from "./schema/types.js"`
- Implementation files export both functions and types

**Barrel Files:**
- `src/index.ts` aggregates public API
- `src/cli/`, `src/schema/`, `src/markdown/` each have focused modules
- No barrel files in subdirectories - imports are explicit

**Pattern from `src/index.ts`:**
```typescript
export { parseSchemaFromFile, parseSchemaFromSDL } from "./schema/parser.js";
export { generateExamples, typeRefToString } from "./schema/examples.js";
export { scanDocsFolder } from "./markdown/loader.js";
export type * from "./schema/types.js";
```

---

*Convention analysis: 2026-02-20*

# Testing Patterns

**Analysis Date:** 2026-02-20

## Test Framework

**Runner:**
- Vitest 4.0.18
- Config: `vitest.config.ts`
- TypeScript support built-in via TypeScript 5.6.0

**Assertion Library:**
- Vitest built-in assertions (no external library needed)
- Uses `expect()` API with chained assertions

**Run Commands:**
```bash
npm test              # Run all tests (vitest run)
npm run dev           # Watch mode with TypeScript compilation
npm run build         # Compile TypeScript (tsc)
```

## Test File Organization

**Location:**
- Co-located with implementation: `src/cli/build.test.ts` next to `src/cli/build.ts`
- Currently only one test file in codebase: `src/cli/build.test.ts`

**Naming:**
- Pattern: `[module].test.ts`
- Extension: `.test.ts` (not `.spec.ts`)

**Structure:**
```
src/
├── cli/
│   ├── build.ts              (implementation)
│   ├── build.test.ts         (tests)
│   ├── config.ts
│   └── index.ts
├── schema/
│   ├── parser.ts
│   ├── types.ts
│   └── examples.ts
└── markdown/
    └── loader.ts
```

**Config:**
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
});
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("docs content splitting", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "yolodocs-test-"));
  });

  afterEach(() => {
    fse.removeSync(tmpDir);
  });

  it("strips content from docs-manifest.json", () => {
    // test body
  });
});
```

**Patterns:**
- `beforeEach()` - Creates temporary directory for each test
- `afterEach()` - Cleans up temporary directory after each test
- `describe()` - Groups related tests into suites
- `it()` - Individual test cases with descriptive names

## Mocking

**Framework:** fs (file system mocking)
- Uses real file system with temporary directories instead of mock libraries
- Creates temp dirs with `fs.mkdtempSync()` for isolation

**Patterns:**
```typescript
// From src/cli/build.test.ts
beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "yolodocs-test-"));
});

afterEach(() => {
  fse.removeSync(tmpDir);
});
```

**What to Mock:**
- File I/O tested with real temporary directories
- Not mocking: fs operations, node:path operations
- Integration testing approach: test actual behavior, not mocked behavior

**What NOT to Mock:**
- External API calls (fetch, HTTP) - not tested
- Child processes - not tested in isolation
- Database operations - N/A

## Fixtures and Factories

**Test Data:**
```typescript
// Inline data objects created per test
const manifest: DocsManifest = {
  pages: [
    {
      slug: "intro",
      title: "Introduction",
      category: "General",
      order: 1,
      content: "# Hello World",
    },
  ],
};
```

**Location:**
- Test data created inline in test functions
- No fixture files or separate factory modules
- Data created from type definitions: `DocsManifest`, `DocsPage`

**Pattern:**
- Each test creates its own specific test data
- Data structures match actual implementation types
- Content variations tested via `it.each()` parametrization

## Coverage

**Requirements:** Not enforced
- No coverage thresholds configured in vitest.config.ts
- No coverage reporting tools set up

**View Coverage:**
- Not currently configured
- Would require: `vitest --coverage` with a coverage provider package

**Current State:**
- Single test file with focused regression tests for specific bug
- Coverage is issue-specific, not comprehensive

## Test Types

**Unit Tests:**
- Scope: Individual functions that manipulate data structures
- Approach: Write input, read output, assert result
- Example: `strips content from docs-manifest.json` tests `writeDocsData()` helper

**Integration Tests:**
- Scope: File I/O operations and data transformations together
- Approach: Create real files on disk, verify content and structure
- Example: `writes individual .js files for each page` verifies disk artifacts

**E2E Tests:**
- Framework: Not configured
- Approach: Manual CLI testing recommended via CLAUDE.md:
  ```bash
  rm -rf test-output && node dist/bin/yolodocs.js --schema schema.graphql --output test-output --title "Carl API" --docs-dir ./docs
  npx serve test-output -p 3456
  ```
- No automated E2E test suite

## Common Patterns

**Async Testing:**
```typescript
// Using async/await in test functions (implicit support)
it("handles async operations", async () => {
  // test body can be async
});

// Not currently used in existing tests - build.test.ts uses sync I/O
```

**Error Testing:**
```typescript
// Testing error conditions is not currently done in test file
// Error handling tested manually in CLI usage
// E2E integration test mentioned in CLAUDE.md is the validation

// Pattern that COULD be used:
it("throws on invalid config", () => {
  const manifest: DocsManifest = { pages: [] };
  expect(() => {
    writeDocsData(tmpDir, manifest);
  }).not.toThrow();
});
```

**Parametrized Tests:**
```typescript
// Using it.each() for testing multiple cases
it.each(problematicCases)(
  "round-trips content with %s",
  (_label, content) => {
    const manifest: DocsManifest = {
      pages: [
        {
          slug: "test-page",
          title: "Test",
          category: "General",
          order: 1,
          content,
        },
      ],
    };

    writeDocsData(tmpDir, manifest);

    const written = JSON.parse(
      fs.readFileSync(path.join(tmpDir, "docs-manifest.json"), "utf-8")
    );
    expect(written.pages[0]).not.toHaveProperty("content");

    const jsContent = fs.readFileSync(
      path.join(tmpDir, "docs-pages", "test-page.js"),
      "utf-8"
    );
    const jsonStr = jsContent.slice("export default ".length, -1);
    const recovered = JSON.parse(jsonStr);
    expect(recovered).toBe(content);
  }
);
```

**Problematic Content Cases:**
- Backticks and template literals
- Backslash sequences (Windows paths, escape chars)
- Unicode line/paragraph separators
- HTML script tags and XSS attempts
- Null bytes and control characters
- Large repeating content patterns

## Regression Test Example

**Test Suite:** `docs content splitting` in `src/cli/build.test.ts`

**Purpose:**
- Verify docs page content splitting (to avoid Nitro prerender JSON corruption)
- Ensure content with dangerous characters survives round-trip
- Confirm docs-manifest.json excludes content field
- Verify individual .js module files are created

**Setup:**
```typescript
const problematicCases: [string, string][] = [
  ["backticks", "Use `template` literals like `this`"],
  ["template literal interpolation", "Value is ${variable}"],
  ["unicode line/paragraph separators", `Before\u2028middle\u2029after`],
  // ... more edge cases
];
```

**Key Test:** `round-trips content with ...`
- Tests each problematic case
- Writes manifest and pages to temp directory
- Reads back and parses
- Verifies content matches original exactly
- Tests that manifest has NO content field
- Tests that .js file contains proper export statement

---

*Testing analysis: 2026-02-20*

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import fse from "fs-extra";
import path from "node:path";
import os from "node:os";
import type { DocsManifest } from "../schema/types.js";

/**
 * Regression test for Nitro prerender JSON corruption.
 *
 * When all doc page content was bundled into a single docs-manifest.json,
 * Nitro's prerender bundler would corrupt the JSON.parse() serialization
 * for certain character sequences (backticks, template literals, unicode
 * separators, etc.), producing a SyntaxError and zero HTML files.
 *
 * The fix splits content into individual .js modules per page. These tests
 * verify that:
 *  1. docs-manifest.json contains NO content field
 *  2. Individual .js files are written for each page
 *  3. Content with problematic characters survives the round-trip
 */

// Reproduces the content-splitting logic from build.ts
function writeDocsData(dataDir: string, docsManifest: DocsManifest) {
  const docsManifestMeta = {
    pages: docsManifest.pages.map(({ content, ...meta }) => meta),
  };
  fs.writeFileSync(
    path.join(dataDir, "docs-manifest.json"),
    JSON.stringify(docsManifestMeta, null, 2)
  );

  const docsPagesDir = path.join(dataDir, "docs-pages");
  fse.ensureDirSync(docsPagesDir);
  for (const page of docsManifest.pages) {
    const pageFile = path.join(docsPagesDir, `${page.slug}.js`);
    fse.ensureDirSync(path.dirname(pageFile));
    fs.writeFileSync(
      pageFile,
      `export default ${JSON.stringify(page.content)};`
    );
  }
}

describe("docs content splitting", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "yolodocs-test-"));
  });

  afterEach(() => {
    fse.removeSync(tmpDir);
  });

  it("strips content from docs-manifest.json", () => {
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

    writeDocsData(tmpDir, manifest);

    const written = JSON.parse(
      fs.readFileSync(path.join(tmpDir, "docs-manifest.json"), "utf-8")
    );
    expect(written.pages).toHaveLength(1);
    expect(written.pages[0].slug).toBe("intro");
    expect(written.pages[0].title).toBe("Introduction");
    expect(written.pages[0]).not.toHaveProperty("content");
  });

  it("writes individual .js files for each page", () => {
    const manifest: DocsManifest = {
      pages: [
        {
          slug: "page-a",
          title: "Page A",
          category: "General",
          order: 1,
          content: "Content A",
        },
        {
          slug: "page-b",
          title: "Page B",
          category: "General",
          order: 2,
          content: "Content B",
        },
      ],
    };

    writeDocsData(tmpDir, manifest);

    expect(
      fs.existsSync(path.join(tmpDir, "docs-pages", "page-a.js"))
    ).toBe(true);
    expect(
      fs.existsSync(path.join(tmpDir, "docs-pages", "page-b.js"))
    ).toBe(true);
  });

  it("creates subdirectories for nested slugs", () => {
    const manifest: DocsManifest = {
      pages: [
        {
          slug: "guides/auth",
          title: "Auth Guide",
          category: "Guides",
          order: 1,
          content: "# Auth",
        },
      ],
    };

    writeDocsData(tmpDir, manifest);

    const filePath = path.join(tmpDir, "docs-pages", "guides", "auth.js");
    expect(fs.existsSync(filePath)).toBe(true);
  });

  // Characters that caused the original Nitro prerender corruption
  const problematicCases: [string, string][] = [
    ["backticks", "Use \\`template\\` literals like \\`this\\`"],
    ["template literal interpolation", "Value is ${variable} and ${other}"],
    [
      "backslash sequences",
      'Path is C:\\Users\\name\\docs and escape \\n \\t \\" sequences',
    ],
    [
      "unicode line/paragraph separators",
      `Before\u2028middle\u2029after`,
    ],
    ["single quotes", "It's a 'quoted' string with \"doubles\" too"],
    ["HTML script tags", '<script>alert("xss")</script> and </script>'],
    ["null bytes and control chars", "Before\x00after and \x01\x02\x03"],
    [
      "mixed dangerous content",
      "```graphql\nquery { user(id: $id) { name } }\n```\n\n${injection}\n\nBackslash: \\ and quote: \" end",
    ],
    [
      "large content with repeating patterns",
      "# Title\n\n".repeat(500) +
        "```\ncode block with `backticks` and ${vars}\n```\n".repeat(100),
    ],
  ];

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

      // Verify manifest has no content
      const written = JSON.parse(
        fs.readFileSync(path.join(tmpDir, "docs-manifest.json"), "utf-8")
      );
      expect(written.pages[0]).not.toHaveProperty("content");

      // Verify the .js file content survives round-trip:
      // The file contains `export default <JSON-stringified content>;`
      // Extracting the JSON string and parsing it should yield the original
      const jsContent = fs.readFileSync(
        path.join(tmpDir, "docs-pages", "test-page.js"),
        "utf-8"
      );
      expect(jsContent.startsWith("export default ")).toBe(true);
      expect(jsContent.endsWith(";")).toBe(true);

      const jsonStr = jsContent.slice("export default ".length, -1);
      const recovered = JSON.parse(jsonStr);
      expect(recovered).toBe(content);
    }
  );

  it("handles empty docs manifest", () => {
    const manifest: DocsManifest = { pages: [] };

    writeDocsData(tmpDir, manifest);

    const written = JSON.parse(
      fs.readFileSync(path.join(tmpDir, "docs-manifest.json"), "utf-8")
    );
    expect(written.pages).toHaveLength(0);
    expect(fs.existsSync(path.join(tmpDir, "docs-pages"))).toBe(true);
  });
});

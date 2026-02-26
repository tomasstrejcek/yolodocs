import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import fse from "fs-extra";
import path from "node:path";
import os from "node:os";
import type { DocsManifest } from "../schema/types.js";
import { buildNavigationManifest, toTitleCase } from "./build.js";

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

// Helper to build an empty schema for use in manifest tests
const emptySchema = {
  queries: [],
  mutations: [],
  subscriptions: [],
  types: [],
  enums: [],
  interfaces: [],
  unions: [],
  inputs: [],
  scalars: [],
};

describe("toTitleCase", () => {
  it("converts a single word", () => {
    expect(toTitleCase("product")).toBe("Product");
  });

  it("converts hyphen-separated words", () => {
    expect(toTitleCase("developer-reference")).toBe("Developer Reference");
  });

  it("converts a multi-part hyphenated slug", () => {
    expect(toTitleCase("auth-and-oauth")).toBe("Auth And Oauth");
  });

  it("leaves already-capitalised word unchanged", () => {
    expect(toTitleCase("Auth")).toBe("Auth");
  });
});

describe("buildNavigationManifest", () => {
  it("produces a 'Documentation' section for root-level pages", () => {
    const docs = {
      pages: [
        { slug: "getting-started", title: "Getting Started", category: "", order: 0, content: "" },
      ],
    };
    const manifest = buildNavigationManifest(emptySchema, docs, "");
    expect(manifest.sections).toHaveLength(1);
    const section = manifest.sections[0];
    expect(section.id).toBe("docs");
    expect(section.title).toBe("Documentation");
    expect(section.items).toHaveLength(1);
    expect(section.items[0].name).toBe("Getting Started");
    expect(section.items[0].anchor).toBe("/getting-started.html");
  });

  it("produces separate NavigationSections per top-level folder", () => {
    const docs = {
      pages: [
        { slug: "product/billing", title: "Billing", category: "", order: 0, content: "" },
        { slug: "developer/api", title: "Api", category: "", order: 0, content: "" },
      ],
    };
    const manifest = buildNavigationManifest(emptySchema, docs, "");
    // developer comes before product alphabetically
    const ids = manifest.sections.map((s) => s.id);
    expect(ids).toContain("docs-developer");
    expect(ids).toContain("docs-product");
    expect(ids).not.toContain("docs");
  });

  it("places root pages in docs section and folder pages in separate sections", () => {
    const docs = {
      pages: [
        { slug: "getting-started", title: "Getting Started", category: "", order: 0, content: "" },
        { slug: "product/billing", title: "Billing", category: "", order: 0, content: "" },
      ],
    };
    const manifest = buildNavigationManifest(emptySchema, docs, "");
    const ids = manifest.sections.map((s) => s.id);
    expect(ids).toContain("docs");
    expect(ids).toContain("docs-product");
    // root section comes first
    expect(ids.indexOf("docs")).toBeLessThan(ids.indexOf("docs-product"));
  });

  it("creates a group item for 3-level slugs (section > group > page)", () => {
    const docs = {
      pages: [
        { slug: "product/guides/filtering", title: "Filtering", category: "", order: 0, content: "" },
        { slug: "product/guides/auth", title: "Auth", category: "", order: 0, content: "" },
      ],
    };
    const manifest = buildNavigationManifest(emptySchema, docs, "");
    expect(manifest.sections).toHaveLength(1);
    const section = manifest.sections[0];
    expect(section.id).toBe("docs-product");
    expect(section.title).toBe("Product");
    // One group item
    expect(section.items).toHaveLength(1);
    const group = section.items[0];
    expect(group.id).toBe("docs-folder-product-guides");
    expect(group.name).toBe("Guides");
    expect(group.anchor).toBe("");
    expect(group.children).toHaveLength(2);
    // children sorted alphabetically (same order => sort by title)
    expect(group.children![0].name).toBe("Auth");
    expect(group.children![1].name).toBe("Filtering");
    expect(group.children![0].anchor).toBe("/product/guides/auth.html");
  });

  it("places ungrouped 2-level pages directly in section (no group wrapper)", () => {
    const docs = {
      pages: [
        { slug: "product/billing", title: "Billing", category: "", order: 0, content: "" },
      ],
    };
    const manifest = buildNavigationManifest(emptySchema, docs, "");
    const section = manifest.sections.find((s) => s.id === "docs-product")!;
    expect(section.items).toHaveLength(1);
    expect(section.items[0].name).toBe("Billing");
    expect(section.items[0].anchor).toBe("/product/billing.html");
    expect(section.items[0].children).toBeUndefined();
  });

  it("title-cases hyphenated folder names for section titles", () => {
    const docs = {
      pages: [
        { slug: "developer-reference/intro", title: "Intro", category: "", order: 0, content: "" },
      ],
    };
    const manifest = buildNavigationManifest(emptySchema, docs, "");
    const section = manifest.sections.find((s) => s.id === "docs-developer-reference")!;
    expect(section.title).toBe("Developer Reference");
  });

  it("title-cases hyphenated group folder names", () => {
    const docs = {
      pages: [
        { slug: "product/getting-started/overview", title: "Overview", category: "", order: 0, content: "" },
      ],
    };
    const manifest = buildNavigationManifest(emptySchema, docs, "");
    const section = manifest.sections.find((s) => s.id === "docs-product")!;
    expect(section.items[0].name).toBe("Getting Started");
  });

  it("sorts docs sections: root first, then folder sections alphabetically", () => {
    const docs = {
      pages: [
        { slug: "getting-started", title: "Getting Started", category: "", order: 0, content: "" },
        { slug: "product/billing", title: "Billing", category: "", order: 0, content: "" },
        { slug: "developer/api", title: "Api", category: "", order: 0, content: "" },
      ],
    };
    const manifest = buildNavigationManifest(emptySchema, docs, "");
    const docsSections = manifest.sections.filter((s) => s.id.startsWith("docs"));
    expect(docsSections[0].id).toBe("docs");
    expect(docsSections[1].id).toBe("docs-developer");
    expect(docsSections[2].id).toBe("docs-product");
  });

  it("within a section: ungrouped pages appear before groups", () => {
    const docs = {
      pages: [
        { slug: "product/billing", title: "Billing", category: "", order: 0, content: "" },
        { slug: "product/guides/filtering", title: "Filtering", category: "", order: 0, content: "" },
      ],
    };
    const manifest = buildNavigationManifest(emptySchema, docs, "");
    const section = manifest.sections.find((s) => s.id === "docs-product")!;
    expect(section.items[0].name).toBe("Billing");
    expect(section.items[1].name).toBe("Guides");
  });

  it("sorts pages by order then title within a section", () => {
    const docs = {
      pages: [
        { slug: "product/z-page", title: "Z Page", category: "", order: 2, content: "" },
        { slug: "product/a-page", title: "A Page", category: "", order: 1, content: "" },
        { slug: "product/m-page", title: "M Page", category: "", order: 1, content: "" },
      ],
    };
    const manifest = buildNavigationManifest(emptySchema, docs, "");
    const section = manifest.sections.find((s) => s.id === "docs-product")!;
    expect(section.items[0].name).toBe("A Page");
    expect(section.items[1].name).toBe("M Page");
    expect(section.items[2].name).toBe("Z Page");
  });

  it("4+ segment slugs: section=parts[0], group=parts[1], leaf=rest joined", () => {
    const docs = {
      pages: [
        { slug: "a/b/c/d", title: "Deep Page", category: "", order: 0, content: "" },
      ],
    };
    const manifest = buildNavigationManifest(emptySchema, docs, "");
    const section = manifest.sections.find((s) => s.id === "docs-a")!;
    expect(section).toBeDefined();
    expect(section.items).toHaveLength(1);
    const group = section.items[0];
    expect(group.id).toBe("docs-folder-a-b");
    expect(group.children).toHaveLength(1);
    expect(group.children![0].anchor).toBe("/a/b/c/d.html");
  });

  it("doc anchors are base-agnostic (base applied at runtime via withBase)", () => {
    const docs = {
      pages: [
        { slug: "getting-started", title: "Getting Started", category: "", order: 0, content: "" },
      ],
    };
    const manifest = buildNavigationManifest(emptySchema, docs, "/v2");
    const section = manifest.sections[0];
    expect(section.items[0].anchor).toBe("/getting-started.html");
  });

  it("schema sections remain unchanged and appear after docs sections", () => {
    const docs = {
      pages: [
        { slug: "intro", title: "Intro", category: "", order: 0, content: "" },
      ],
    };
    const schemaWithQuery = {
      ...emptySchema,
      queries: [{ name: "getUser", description: null, type: { name: "User", kind: "OBJECT" as const, ofType: null }, args: [], isDeprecated: false, deprecationReason: null }],
    };
    const manifest = buildNavigationManifest(schemaWithQuery, docs, "");
    expect(manifest.sections[0].id).toBe("docs");
    expect(manifest.sections[1].id).toBe("queries");
  });

  it("produces no docs sections when docs are empty", () => {
    const manifest = buildNavigationManifest(emptySchema, { pages: [] }, "");
    expect(manifest.sections).toHaveLength(0);
  });

  it("full example: getting-started + product/billing + product/guides/filtering + product/guides/auth + developer/api", () => {
    const docs = {
      pages: [
        { slug: "getting-started", title: "Getting Started", category: "", order: 0, content: "" },
        { slug: "product/billing", title: "Billing", category: "", order: 0, content: "" },
        { slug: "product/guides/filtering", title: "Filtering", category: "", order: 0, content: "" },
        { slug: "product/guides/auth", title: "Auth", category: "", order: 0, content: "" },
        { slug: "developer/api", title: "Api", category: "", order: 0, content: "" },
      ],
    };
    const manifest = buildNavigationManifest(emptySchema, docs, "");

    const docsSection = manifest.sections.find((s) => s.id === "docs")!;
    expect(docsSection.items[0].name).toBe("Getting Started");

    const developerSection = manifest.sections.find((s) => s.id === "docs-developer")!;
    expect(developerSection.items[0].name).toBe("Api");

    const productSection = manifest.sections.find((s) => s.id === "docs-product")!;
    expect(productSection.items[0].name).toBe("Billing"); // ungrouped first
    expect(productSection.items[1].name).toBe("Guides"); // group second
    expect(productSection.items[1].children).toHaveLength(2);
    expect(productSection.items[1].children![0].name).toBe("Auth");
    expect(productSection.items[1].children![1].name).toBe("Filtering");
  });
});

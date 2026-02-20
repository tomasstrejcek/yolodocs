import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import fse from "fs-extra";
import path from "node:path";
import os from "node:os";
import {
  extractFirstH1,
  assertNoSlugCollisions,
  scanDocsFolder,
} from "./loader.js";

// ---------------------------------------------------------------------------
// extractFirstH1
// ---------------------------------------------------------------------------

describe("extractFirstH1", () => {
  it("extracts a plain H1", () => {
    expect(extractFirstH1("# Hello World\n\nSome body text.")).toBe(
      "Hello World"
    );
  });

  it("extracts the first H1 when preceded by other headings", () => {
    expect(extractFirstH1("## Not H1\n# Actual H1\n\nBody.")).toBe("Actual H1");
  });

  it("returns null when there is no H1", () => {
    expect(extractFirstH1("## Only an H2\n\nNo heading here.")).toBeNull();
    expect(extractFirstH1("No heading here")).toBeNull();
    expect(extractFirstH1("")).toBeNull();
  });

  it("preserves inline code markdown in H1", () => {
    expect(extractFirstH1("# `createUser` Mutation")).toBe(
      "`createUser` Mutation"
    );
  });

  it("preserves bold markdown in H1", () => {
    expect(extractFirstH1("# **Bold Title**")).toBe("**Bold Title**");
  });

  it("extracts H1 when it does not start at line 1", () => {
    expect(extractFirstH1("\n\n\n# Late H1\n\nBody.")).toBe("Late H1");
  });

  it("ignores H2+ headings before the first H1", () => {
    expect(
      extractFirstH1("## Section A\n\n### Sub\n\n# Actual Title\n\nBody.")
    ).toBe("Actual Title");
  });

  it("trims trailing whitespace from the H1 capture", () => {
    expect(extractFirstH1("# Title With Trailing Space   \n\nBody.")).toBe(
      "Title With Trailing Space"
    );
  });
});

// ---------------------------------------------------------------------------
// Title priority chain (tested via scanDocsFolder)
// ---------------------------------------------------------------------------

describe("title priority chain via scanDocsFolder", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "yolodocs-loader-test-"));
  });

  afterEach(() => {
    fse.removeSync(tmpDir);
  });

  function writeFile(relPath: string, content: string) {
    const fullPath = path.join(tmpDir, relPath);
    fse.ensureDirSync(path.dirname(fullPath));
    fs.writeFileSync(fullPath, content, "utf-8");
  }

  it("uses frontmatter title when set, even if H1 is present", () => {
    writeFile(
      "my-page.md",
      "---\ntitle: Override Title\n---\n\n# H1 Title\n\nBody."
    );
    const manifest = scanDocsFolder(tmpDir);
    expect(manifest.pages[0].title).toBe("Override Title");
  });

  it("uses H1 when frontmatter title is absent", () => {
    writeFile("my-page.md", "# H1 Title\n\nBody.");
    const manifest = scanDocsFolder(tmpDir);
    expect(manifest.pages[0].title).toBe("H1 Title");
  });

  it("uses filename when neither frontmatter title nor H1 is present", () => {
    writeFile("my-page.md", "Just some body text with no heading.");
    const manifest = scanDocsFolder(tmpDir);
    expect(manifest.pages[0].title).toBe("my-page");
  });

  it("priority: frontmatter > H1 > filename — all three scenarios correct", () => {
    // Frontmatter wins
    writeFile("a.md", "---\ntitle: FM\n---\n\n# H1\n\nBody.");
    // H1 wins over filename
    writeFile("b.md", "# H1 Win\n\nBody.");
    // Filename as last resort
    writeFile("c.md", "No headings at all.");

    const manifest = scanDocsFolder(tmpDir);
    const bySlug = Object.fromEntries(manifest.pages.map((p) => [p.slug, p]));
    expect(bySlug["a"].title).toBe("FM");
    expect(bySlug["b"].title).toBe("H1 Win");
    expect(bySlug["c"].title).toBe("c");
  });
});

// ---------------------------------------------------------------------------
// Slug normalization (tested via scanDocsFolder with real temp files)
// ---------------------------------------------------------------------------

describe("slug normalization via scanDocsFolder", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "yolodocs-loader-test-"));
  });

  afterEach(() => {
    fse.removeSync(tmpDir);
  });

  function writeFile(relPath: string, content = "# Title\n\nBody.") {
    const fullPath = path.join(tmpDir, relPath);
    fse.ensureDirSync(path.dirname(fullPath));
    fs.writeFileSync(fullPath, content, "utf-8");
  }

  it("produces a clean slug without leading or trailing slashes", () => {
    writeFile("guides/auth.md");
    const manifest = scanDocsFolder(tmpDir);
    expect(manifest.pages[0].slug).toBe("guides/auth");
    // No leading or trailing slash
    expect(manifest.pages[0].slug).not.toMatch(/^\//);
    expect(manifest.pages[0].slug).not.toMatch(/\/$/);
  });

  it("produces slugs without double slashes", () => {
    // The only way to get double slashes is if the OS path has them;
    // this test validates the normalization code runs without error
    // and that nested paths produce correct slugs.
    writeFile("guides/nested/deep.md");
    const manifest = scanDocsFolder(tmpDir);
    expect(manifest.pages[0].slug).toBe("guides/nested/deep");
    expect(manifest.pages[0].slug).not.toContain("//");
  });
});

// ---------------------------------------------------------------------------
// assertNoSlugCollisions
// ---------------------------------------------------------------------------

describe("assertNoSlugCollisions", () => {
  it("does not throw when slugs are unrelated", () => {
    const pages = [
      { slug: "api", title: "API", category: "General", order: 1, content: "" },
      { slug: "auth", title: "Auth", category: "General", order: 2, content: "" },
      { slug: "dev/api", title: "Dev API", category: "General", order: 3, content: "" },
      { slug: "dev/auth", title: "Dev Auth", category: "General", order: 4, content: "" },
    ];
    expect(() => assertNoSlugCollisions(pages)).not.toThrow();
  });

  it("throws when a slug is a prefix of another slug", () => {
    const pages = [
      { slug: "api", title: "API", category: "General", order: 1, content: "" },
      { slug: "api/intro", title: "Intro", category: "General", order: 2, content: "" },
    ];
    expect(() => assertNoSlugCollisions(pages)).toThrow(/api/);
  });

  it("throws with a descriptive message naming both conflicting slugs", () => {
    const pages = [
      { slug: "dev/api", title: "API", category: "General", order: 1, content: "" },
      {
        slug: "dev/api/intro",
        title: "Intro",
        category: "General",
        order: 2,
        content: "",
      },
    ];
    expect(() => assertNoSlugCollisions(pages)).toThrowError(
      /dev\/api.*dev\/api\/intro|dev\/api\/intro.*dev\/api/
    );
  });

  it("does not throw when no prefix collisions exist", () => {
    const pages = [
      { slug: "api", title: "API", category: "General", order: 1, content: "" },
      { slug: "auth", title: "Auth", category: "General", order: 2, content: "" },
    ];
    expect(() => assertNoSlugCollisions(pages)).not.toThrow();
  });

  it("handles an empty pages array", () => {
    expect(() => assertNoSlugCollisions([])).not.toThrow();
  });

  it("handles a single-page array", () => {
    const pages = [
      { slug: "intro", title: "Intro", category: "General", order: 1, content: "" },
    ];
    expect(() => assertNoSlugCollisions(pages)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Integration: scanDocsFolder with collision detection
// ---------------------------------------------------------------------------

describe("scanDocsFolder collision detection", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "yolodocs-loader-test-"));
  });

  afterEach(() => {
    fse.removeSync(tmpDir);
  });

  function writeFile(relPath: string, content = "# Title\n\nBody.") {
    const fullPath = path.join(tmpDir, relPath);
    fse.ensureDirSync(path.dirname(fullPath));
    fs.writeFileSync(fullPath, content, "utf-8");
  }

  it("throws when a file and a sibling folder share the same basename", () => {
    writeFile("developer/api.md");
    writeFile("developer/api/intro.md");
    expect(() => scanDocsFolder(tmpDir)).toThrow(/developer\/api/);
  });

  it("does not throw for non-conflicting nested docs", () => {
    writeFile("developer/api.md");
    writeFile("developer/auth/intro.md");
    expect(() => scanDocsFolder(tmpDir)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Integration: full scanDocsFolder scan
// ---------------------------------------------------------------------------

describe("scanDocsFolder integration", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "yolodocs-loader-test-"));
  });

  afterEach(() => {
    fse.removeSync(tmpDir);
  });

  function writeFile(relPath: string, content: string) {
    const fullPath = path.join(tmpDir, relPath);
    fse.ensureDirSync(path.dirname(fullPath));
    fs.writeFileSync(fullPath, content, "utf-8");
  }

  it("returns empty pages for nonexistent directory", () => {
    const manifest = scanDocsFolder("/nonexistent-directory-xyz");
    expect(manifest.pages).toHaveLength(0);
  });

  it("scans nested directories and produces correct slugs", () => {
    writeFile("getting-started.md", "# Getting Started\n\nIntro.");
    writeFile("guides/auth.md", "# Auth Guide\n\nAuth.");
    writeFile("guides/pagination.md", "# Pagination\n\nPaging.");

    const manifest = scanDocsFolder(tmpDir);
    const slugs = manifest.pages.map((p) => p.slug).sort();
    expect(slugs).toEqual(["getting-started", "guides/auth", "guides/pagination"]);
  });

  it("picks up both .md and .mdx files", () => {
    writeFile("page.md", "# MD Page\n\nContent.");
    writeFile("other.mdx", "# MDX Page\n\nContent.");

    const manifest = scanDocsFolder(tmpDir);
    const slugs = manifest.pages.map((p) => p.slug).sort();
    expect(slugs).toEqual(["other", "page"]);
  });

  it("correctly derives titles for each priority scenario in a real scan", () => {
    writeFile(
      "with-frontmatter.md",
      "---\ntitle: Frontmatter Title\n---\n\n# H1 Title\n\nBody."
    );
    writeFile("with-h1.md", "# Content Title\n\nBody.");
    writeFile("filename-only.md", "Just body with no heading.");

    const manifest = scanDocsFolder(tmpDir);
    const bySlug = Object.fromEntries(manifest.pages.map((p) => [p.slug, p]));

    expect(bySlug["with-frontmatter"].title).toBe("Frontmatter Title");
    expect(bySlug["with-h1"].title).toBe("Content Title");
    expect(bySlug["filename-only"].title).toBe("filename-only");
  });
});

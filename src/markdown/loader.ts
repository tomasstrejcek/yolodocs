import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { DocsManifest, DocsPage } from "../schema/types.js";

/**
 * Extract the text of the first H1 heading from a raw markdown body.
 *
 * Uses the /m flag so that ^ matches the start of any line, not just the
 * start of the string. This correctly handles files that begin with blank
 * lines or have H2/H3 headings before the first H1.
 *
 * Returns the raw markdown text (inline markup such as backticks and bold is
 * preserved as-is). Returns null when no H1 is found.
 */
export function extractFirstH1(body: string): string | null {
  const match = body.match(/^#\s+(.+)/m);
  return match ? match[1].trim() : null;
}

/**
 * Assert that no slug is a path-prefix of another slug in the pages array.
 *
 * Example collision: slug "developer/api" and slug "developer/api/intro"
 * would cause routing ambiguity because the path /developer/api cannot
 * be both a file page and a parent directory of another file page.
 *
 * Throws a descriptive Error naming both conflicting slugs so the author
 * knows exactly which file to rename.
 */
export function assertNoSlugCollisions(pages: DocsPage[]): void {
  const slugSet = new Set(pages.map((p) => p.slug));

  for (const slug of slugSet) {
    const parts = slug.split("/");
    // Check all strict prefixes of this slug (not the slug itself)
    for (let i = 1; i < parts.length; i++) {
      const prefix = parts.slice(0, i).join("/");
      if (slugSet.has(prefix)) {
        throw new Error(
          `Slug collision detected: "${prefix}" exists as both a file and a parent path of "${slug}". ` +
            `Rename either the file "${prefix}.md" or the directory "${prefix}/" to avoid ambiguity.`
        );
      }
    }
  }
}

export function scanDocsFolder(docsDir: string): DocsManifest {
  const pages: DocsPage[] = [];

  if (!fs.existsSync(docsDir)) {
    return { pages };
  }

  scanDir(docsDir, docsDir, pages);

  // Detect slug collisions before sorting — fails fast with a descriptive error.
  assertNoSlugCollisions(pages);

  // Sort by order, then by title
  pages.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    if (a.order !== b.order) return a.order - b.order;
    return a.title.localeCompare(b.title);
  });

  return { pages };
}

function scanDir(
  baseDir: string,
  currentDir: string,
  pages: DocsPage[]
): void {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      scanDir(baseDir, fullPath, pages);
    } else if (entry.name.endsWith(".md") || entry.name.endsWith(".mdx")) {
      const content = fs.readFileSync(fullPath, "utf-8");
      const { data: frontmatter, content: body } = matter(content);

      const relativePath = path.relative(baseDir, fullPath);
      const slug = relativePath
        .replace(/\.(md|mdx)$/, "")
        .replace(/\\/g, "/") // Windows path separator normalization
        .replace(/\/+/g, "/") // Collapse double slashes
        .replace(/^\/|\/$/g, ""); // Strip leading/trailing slashes

      // Title priority chain: frontmatter.title > first H1 > filename (basename without ext)
      const h1Title = extractFirstH1(body);
      const title =
        (frontmatter.title as string) ||
        h1Title ||
        path.basename(entry.name, path.extname(entry.name));

      pages.push({
        slug,
        title,
        category: (frontmatter.category as string) || "General",
        order: (frontmatter.order as number) || 999,
        content: body,
      });
    }
  }
}

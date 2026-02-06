import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { DocsManifest, DocsPage } from "../schema/types.js";

export function scanDocsFolder(docsDir: string): DocsManifest {
  const pages: DocsPage[] = [];

  if (!fs.existsSync(docsDir)) {
    return { pages };
  }

  scanDir(docsDir, docsDir, pages);

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
        .replace(/\\/g, "/");

      pages.push({
        slug,
        title:
          (frontmatter.title as string) ||
          path.basename(entry.name, path.extname(entry.name)),
        category: (frontmatter.category as string) || "General",
        order: (frontmatter.order as number) || 999,
        content: body,
      });
    }
  }
}

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
export declare function extractFirstH1(body: string): string | null;
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
export declare function assertNoSlugCollisions(pages: DocsPage[]): void;
export declare function scanDocsFolder(docsDir: string): DocsManifest;
//# sourceMappingURL=loader.d.ts.map
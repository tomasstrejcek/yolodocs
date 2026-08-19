// GitHub-compatible heading slugs, so anchors authors already write in their
// markdown (`[jump](#adding-a-page)`) resolve, and so Pagefind can attribute a
// match to the nearest heading and deep-link into long pages.

export function slugifyHeading(text: string): string {
  return (
    text
      .replace(/<[^>]*>/g, "")
      .replace(/[`*~]/g, "")
      // Underscores are emphasis markers around a word but part of an identifier
      // inside one, and `collaboration_ready` must keep its.
      .split(/\s+/)
      .map((word) => word.replace(/^_+|_+$/g, ""))
      .join(" ")
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}\s_-]/gu, "")
      .replace(/\s+/g, "-")
  );
}

/**
 * Slugger with per-document state: repeated headings get `-1`, `-2`, … the way
 * GitHub disambiguates them, so every id on the page is unique.
 */
export function createHeadingSlugger(): (text: string) => string {
  const seen = new Map<string, number>();
  return (text: string): string => {
    const base = slugifyHeading(text) || "section";
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count}`;
  };
}

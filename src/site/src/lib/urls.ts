// Pure URL helpers shared by the router (app.tsx) and the search client.
// Kept free of imports so they can be unit-tested without the Solid runtime.

/**
 * Router URL normalizer. Static output is `<slug>.html`, while route
 * definitions are clean paths, so `.html` is stripped for matching — including
 * when a hash or query follows, which sub-result deep links always have.
 */
export function transformUrl(url: string): string {
  return url.replace(/\/index\.html(?=[?#]|$)/, "/").replace(/\.html(?=[?#]|$)/, "");
}

/**
 * Turn a Pagefind result URL into an argument for navigate(), or null when it
 * does not name a page this site ships.
 *
 * The null case is the guard: Pagefind indexes whatever HTML sits under the
 * output root, and anything unexpected there (a leftover build dir, a stray
 * prerendered data route) would otherwise become a search hit that 404s.
 *
 * `.html` is kept, matching the sidebar's nav targets, so the URL a result
 * pushes into history still resolves on a hard refresh.
 */
export function toRouterPath(url: string, base: string, knownSlugs: Set<string>): string | null {
  let rest = url;
  if (base && rest.startsWith(base)) rest = rest.slice(base.length);

  const hashAt = rest.indexOf("#");
  const hash = hashAt === -1 ? "" : rest.slice(hashAt);
  let pathname = hashAt === -1 ? rest : rest.slice(0, hashAt);

  const queryAt = pathname.indexOf("?");
  if (queryAt !== -1) pathname = pathname.slice(0, queryAt);

  if (!pathname.startsWith("/")) pathname = `/${pathname}`;
  pathname = pathname.replace(/\/index\.html$/, "/").replace(/\.html$/, "");
  if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);

  if (pathname === "/") return `/${hash}`;
  if (pathname === "/reference") return `/reference${hash}`;

  const slug = pathname.slice(1);
  if (!knownSlugs.has(slug)) return null;
  return `/${slug}.html${hash}`;
}

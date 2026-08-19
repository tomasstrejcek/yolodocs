// Pagefind client wrapper.
// pagefind.js is generated post-build into ${base}/_pagefind/ by the CLI.
// Vite/Vinxi must NOT statically resolve the import — the file does not exist
// inside src/site at build time.

import { base } from "./base-path";
import { toRouterPath } from "./urls";
import docsManifest from "../data/docs-manifest.json";

export interface DocsResult {
  url: string;
  title: string;
  excerpt: string; // may contain <mark> highlight tags from Pagefind
}

interface PagefindAPI {
  init: () => Promise<void>;
  search: (query: string) => Promise<{
    results: Array<{ data: () => Promise<PagefindData> }>;
  }>;
}

interface PagefindSubResult {
  url?: string;
  title?: string;
  excerpt?: string;
}

interface PagefindData {
  url?: string;
  excerpt?: string;
  meta?: { title?: string };
  sub_results?: PagefindSubResult[];
}

// Pages the build actually emitted. A result outside this set is index debris,
// not a page — see toRouterPath.
const knownSlugs = new Set<string>(
  ((docsManifest as any).pages || []).map((p: any) => String(p.slug)),
);

const MAX_RESULTS = 6;
// Two per page keeps one long page (the schema reference above all) from
// crowding out every other page.
const MAX_SUB_RESULTS_PER_PAGE = 2;

let loadPromise: Promise<PagefindAPI | null> | null = null;

function loadPagefind(): Promise<PagefindAPI | null> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    if (typeof window === "undefined") return null;
    try {
      const url = `${base}/_pagefind/pagefind.js`;
      const mod = (await import(/* @vite-ignore */ url)) as PagefindAPI;
      await mod.init();
      return mod;
    } catch {
      return null;
    }
  })();
  return loadPromise;
}

export function preloadSearch(): void {
  void loadPagefind();
}

export async function searchDocs(query: string): Promise<DocsResult[]> {
  if (!query.trim()) return [];
  const pf = await loadPagefind();
  if (!pf) return [];
  try {
    const res = await pf.search(query);
    const out: DocsResult[] = [];
    const seen = new Set<string>();

    for (const r of res.results.slice(0, 20)) {
      const data = await r.data();
      const pageUrl = normalizeUrl(String(data.url || ""));
      if (!pageUrl) continue;
      const pageTitle = String(data.meta?.title || pageUrl);

      for (const hit of pageHits(data, pageUrl, pageTitle)) {
        if (seen.has(hit.url)) continue;
        seen.add(hit.url);
        out.push(hit);
        if (out.length >= MAX_RESULTS) return out;
      }
    }
    return out;
  } catch {
    return [];
  }
}

// A page contributes its matching sections when Pagefind found any, so a result
// lands on the heading that matched instead of the top of a long page.
function pageHits(data: PagefindData, pageUrl: string, pageTitle: string): DocsResult[] {
  const subs = (data.sub_results || [])
    .map((sub) => ({ sub, url: normalizeUrl(String(sub.url || "")) }))
    .filter((entry) => entry.url && entry.url !== pageUrl)
    .slice(0, MAX_SUB_RESULTS_PER_PAGE);

  if (subs.length === 0) {
    return [{ url: pageUrl, title: pageTitle, excerpt: String(data.excerpt || "") }];
  }

  return subs.map(({ sub, url }) => ({
    url: url!,
    title: sub.title ? `${pageTitle} › ${sub.title}` : pageTitle,
    excerpt: String(sub.excerpt || data.excerpt || ""),
  }));
}

// Pagefind indexes the rendered HTML output. Returns "" for any URL that is not
// a page of this site, so index debris can never become a clickable result.
export function normalizeUrl(url: string): string {
  return toRouterPath(url, base, knownSlugs) || "";
}

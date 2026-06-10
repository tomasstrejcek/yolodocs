// Pagefind client wrapper.
// pagefind.js is generated post-build into ${base}/_pagefind/ by the CLI.
// Vite/Vinxi must NOT statically resolve the import — the file does not exist
// inside src/site at build time.

import { base } from "./base-path";

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

interface PagefindData {
  url?: string;
  excerpt?: string;
  meta?: { title?: string };
}

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
      const path = normalizeUrl(String(data.url || ""));
      if (!path || seen.has(path)) continue;
      seen.add(path);
      out.push({
        url: path,
        title: String(data.meta?.title || path || "Untitled"),
        excerpt: String(data.excerpt || ""),
      });
      if (out.length >= 6) break;
    }
    return out;
  } catch {
    return [];
  }
}

// Pagefind indexes the rendered HTML output. Strip the base prefix and
// .html / /index.html so the router (which sees clean paths) can match.
export function normalizeUrl(url: string): string {
  let path = url;
  if (base && path.startsWith(base)) path = path.slice(base.length);
  if (path.endsWith("/index.html")) path = path.slice(0, -"index.html".length);
  else if (path.endsWith(".html")) path = path.slice(0, -".html".length);
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  if (!path.startsWith("/")) path = "/" + path;
  return path;
}

// Pagefind client wrapper
// Pagefind is loaded from the generated _pagefind/ directory at runtime

let pagefind: any = null;

export async function initSearch(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  try {
    pagefind = await import(/* @vite-ignore */ "/_pagefind/pagefind.js");
    await pagefind.init();
    return true;
  } catch {
    return false;
  }
}

export async function search(query: string): Promise<SearchResult[]> {
  if (!pagefind) {
    const ok = await initSearch();
    if (!ok) return [];
  }

  try {
    const results = await pagefind.search(query);
    const items: SearchResult[] = [];

    for (const result of results.results.slice(0, 15)) {
      const data = await result.data();
      items.push({
        title: data.meta?.title || "",
        excerpt: data.excerpt || "",
        url: data.url || "",
      });
    }

    return items;
  } catch {
    return [];
  }
}

export interface SearchResult {
  title: string;
  excerpt: string;
  url: string;
}

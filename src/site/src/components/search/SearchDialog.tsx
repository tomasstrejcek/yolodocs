import { createSignal, createEffect, Show, For, onCleanup } from "solid-js";
import { useNavigate } from "@solidjs/router";
import manifest from "../../data/manifest.json";
import { withBase } from "../../lib/base-path";

interface SearchResult {
  id: string;
  name: string;
  section: string;
  anchor: string;
  description: string;
}

function flattenNavItems(
  items: any[],
  sectionTitle: string,
  into: SearchResult[]
): void {
  for (const item of items) {
    if (item.children && item.children.length > 0) {
      // Group header: not navigable itself, recurse into children
      flattenNavItems(item.children, sectionTitle, into);
    } else if (item.anchor) {
      into.push({
        id: item.id,
        name: item.name,
        section: sectionTitle,
        anchor: item.anchor,
        description: item.description || "",
      });
    }
  }
}

export function SearchDialog(props: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = createSignal("");
  const [results, setResults] = createSignal<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  let inputRef: HTMLInputElement | undefined;

  const allItems: SearchResult[] = [];
  for (const section of (manifest as any).sections || []) {
    flattenNavItems(section.items, section.title, allItems);
  }

  const search = (q: string) => {
    setQuery(q);
    setSelectedIndex(0);
    if (!q.trim()) {
      setResults([]);
      return;
    }

    const lower = q.toLowerCase();
    const filtered = allItems.filter(
      (item) =>
        item.name.toLowerCase().includes(lower) ||
        item.section.toLowerCase().includes(lower) ||
        item.description.toLowerCase().includes(lower)
    );

    // Sort: exact prefix matches first, then contains
    filtered.sort((a, b) => {
      const aPrefix = a.name.toLowerCase().startsWith(lower);
      const bPrefix = b.name.toLowerCase().startsWith(lower);
      if (aPrefix && !bPrefix) return -1;
      if (!aPrefix && bPrefix) return 1;
      return a.name.localeCompare(b.name);
    });

    setResults(filtered.slice(0, 20));
  };

  const navigate = (result: SearchResult) => {
    const isDoc = result.anchor.startsWith("/docs/") || result.anchor.includes("/docs/");
    if (isDoc) {
      window.location.href = result.anchor;
    } else {
      window.location.href = withBase(`/reference${result.anchor}`);
    }
    props.onClose();
    setQuery("");
    setResults([]);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results().length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results().length > 0) {
      e.preventDefault();
      navigate(results()[selectedIndex()]);
    }
  };

  // Focus input when dialog opens
  createEffect(() => {
    if (props.open) {
      setTimeout(() => inputRef?.focus(), 0);
    }
  });

  const sectionBadge: Record<string, { label: string; cls: string }> = {
    Queries: { label: "QUERY", cls: "bg-accent-green/20 text-accent-green" },
    Mutations: { label: "MUTATION", cls: "bg-accent-orange/20 text-accent-orange" },
    Types: { label: "TYPE", cls: "bg-accent-blue/20 text-accent-blue" },
    Enums: { label: "ENUM", cls: "bg-accent-purple/20 text-accent-purple" },
    Interfaces: { label: "IFACE", cls: "bg-syntax-type/20 text-syntax-type" },
    Unions: { label: "UNION", cls: "bg-syntax-variable/20 text-syntax-variable" },
    "Input Types": { label: "INPUT", cls: "bg-accent-orange/20 text-accent-orange" },
    Inputs: { label: "INPUT", cls: "bg-accent-orange/20 text-accent-orange" },
    Scalars: { label: "SCALAR", cls: "bg-text-muted/20 text-text-muted" },
    Subscriptions: { label: "SUB", cls: "bg-accent-purple/20 text-accent-purple" },
  };

  const getBadge = (section: string) => {
    return sectionBadge[section] || { label: section.toUpperCase().slice(0, 6), cls: "bg-bg-tertiary text-text-muted" };
  };

  return (
    <Show when={props.open}>
      <div class="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
        {/* Backdrop */}
        <div
          class="fixed inset-0 bg-black/60 backdrop-blur-sm"
          onClick={props.onClose}
        />

        {/* Dialog */}
        <div class="relative w-full max-w-xl mx-4 bg-bg-secondary border border-border-primary rounded-xl shadow-2xl overflow-hidden">
          {/* Input */}
          <div class="flex items-center px-4 border-b border-border-primary">
            <svg class="w-5 h-5 text-text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              class="flex-1 px-3 py-3 bg-transparent text-text-primary text-sm outline-none placeholder:text-text-muted"
              placeholder="Search types, queries, mutations..."
              value={query()}
              onInput={(e) => search(e.currentTarget.value)}
              onKeyDown={handleKeyDown}
              autofocus
            />
            <kbd class="text-xs text-text-muted bg-bg-tertiary px-1.5 py-0.5 rounded border border-border-primary">
              Esc
            </kbd>
          </div>

          {/* Results */}
          <Show when={results().length > 0}>
            <div class="max-h-[50vh] overflow-y-auto py-1">
              <For each={results()}>
                {(result, i) => {
                  const badge = getBadge(result.section);
                  return (
                    <button
                      class="w-full flex items-center gap-2.5 px-4 py-2 text-left hover:bg-bg-hover transition-colors"
                      classList={{ "bg-bg-hover": selectedIndex() === i() }}
                      onClick={() => navigate(result)}
                      onMouseEnter={() => setSelectedIndex(i())}
                    >
                      <span
                        class={`shrink-0 w-16 text-center px-1 py-0.5 text-[9px] font-bold rounded tracking-wider ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                      <span class="text-sm text-text-primary font-mono shrink-0">
                        {result.name}
                      </span>
                      <Show when={result.description}>
                        <span class="text-xs text-text-muted truncate">
                          — {result.description.replace(/\n/g, " ").slice(0, 80)}
                        </span>
                      </Show>
                    </button>
                  );
                }}
              </For>
            </div>
          </Show>

          {/* Empty state */}
          <Show when={query().trim() && results().length === 0}>
            <div class="px-4 py-8 text-center">
              <p class="text-sm text-text-muted">No results for "{query()}"</p>
            </div>
          </Show>

          {/* Initial state */}
          <Show when={!query().trim()}>
            <div class="px-4 py-6 text-center">
              <p class="text-sm text-text-muted">
                Type to search across {allItems.length} schema items
              </p>
            </div>
          </Show>
        </div>
      </div>
    </Show>
  );
}

// Re-export for barrel
export function SearchResults() {
  return null;
}

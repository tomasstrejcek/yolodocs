import { For, createSignal, Show, onMount, onCleanup } from "solid-js";
import { useLocation } from "@solidjs/router";
import manifest from "../../data/manifest.json";

interface Props {
  onNavigate?: () => void;
  activeId?: string;
}

export function Sidebar(props: Props) {
  const location = useLocation();
  const [hash, setHash] = createSignal(
    typeof window !== "undefined" ? window.location.hash : ""
  );

  onMount(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    // Also update on click-driven navigation
    const onClick = () => setTimeout(() => setHash(window.location.hash), 0);
    window.addEventListener("click", onClick);
    onCleanup(() => {
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("click", onClick);
    });
  });

  const derivedActiveId = () => {
    if (props.activeId) return props.activeId;
    // For doc pages, match by pathname
    const pathname = location.pathname;
    if (pathname.startsWith("/docs/")) {
      const slug = pathname.replace("/docs/", "");
      return `doc-${slug}`;
    }
    // For reference page, match by hash
    const h = hash();
    if (h) return h.slice(1); // remove #
    return "";
  };

  return (
    <nav class="py-4 px-3">
      <For each={manifest.sections}>
        {(section) => (
          <SidebarSection
            id={section.id}
            title={section.title}
            items={section.items}
            activeId={derivedActiveId()}
            onNavigate={props.onNavigate}
          />
        )}
      </For>
    </nav>
  );
}

function SidebarSection(props: {
  id: string;
  title: string;
  items: Array<{ id: string; name: string; anchor: string }>;
  activeId?: string;
  onNavigate?: () => void;
}) {
  const [collapsed, setCollapsed] = createSignal(false);
  const location = useLocation();

  const isDocSection = () => props.id.startsWith("docs-");

  return (
    <div class="mb-4">
      <button
        class="flex items-center justify-between w-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted hover:text-text-secondary transition-colors font-mono"
        onClick={() => setCollapsed(!collapsed())}
      >
        <span>{props.title}</span>
        <svg
          class="w-3 h-3 transition-transform"
          classList={{ "rotate-[-90deg]": collapsed() }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <Show when={!collapsed()}>
        <ul class="mt-1 ml-3 border-l border-border-primary">
          <For each={props.items}>
            {(item) => {
              const href = () => {
                if (isDocSection()) return item.anchor;
                return `/reference${item.anchor}`;
              };
              const isActive = () => props.activeId === item.id;

              return (
                <li>
                  <a
                    href={href()}
                    class="block pl-3 py-1 text-sm no-underline truncate -ml-px border-l-2 transition-colors"
                    classList={{
                      "font-semibold text-text-primary border-accent-blue": isActive(),
                      "text-text-secondary border-transparent hover:text-text-primary hover:border-text-muted": !isActive(),
                    }}
                    onClick={() => props.onNavigate?.()}
                  >
                    {item.name}
                  </a>
                </li>
              );
            }}
          </For>
        </ul>
      </Show>
    </div>
  );
}

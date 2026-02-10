import { For, createSignal, Show, onMount, onCleanup } from "solid-js";
import { useLocation } from "@solidjs/router";
import manifest from "../../data/manifest.json";
import { withBase } from "../../lib/base-path";

interface NavItem {
  id: string;
  name: string;
  anchor: string;
  children?: NavItem[];
}

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
    const docsPrefix = withBase("/docs/");
    if (pathname.startsWith(docsPrefix)) {
      const slug = pathname.slice(docsPrefix.length);
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
            items={section.items as NavItem[]}
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
  items: NavItem[];
  activeId?: string;
  onNavigate?: () => void;
}) {
  const [collapsed, setCollapsed] = createSignal(false);

  const isDocSection = () => props.id.startsWith("docs");

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
              if (item.children && item.children.length > 0) {
                return (
                  <SidebarSubGroup
                    item={item}
                    activeId={props.activeId}
                    isDocSection={isDocSection()}
                    onNavigate={props.onNavigate}
                  />
                );
              }

              const href = () => {
                if (isDocSection()) return item.anchor;
                return withBase(`/reference${item.anchor}`);
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

function SidebarSubGroup(props: {
  item: NavItem;
  activeId?: string;
  isDocSection: boolean;
  onNavigate?: () => void;
}) {
  const [collapsed, setCollapsed] = createSignal(false);

  const hasActiveChild = () =>
    props.item.children?.some((child) => child.id === props.activeId) ?? false;

  return (
    <li class="mt-1">
      <button
        class="flex items-center gap-1 w-full pl-3 py-1 text-sm no-underline -ml-px border-l-2 border-transparent transition-colors"
        classList={{
          "font-semibold text-text-primary": hasActiveChild(),
          "text-text-secondary hover:text-text-primary": !hasActiveChild(),
        }}
        onClick={() => setCollapsed(!collapsed())}
      >
        <svg
          class="w-3 h-3 shrink-0 transition-transform"
          classList={{ "rotate-[-90deg]": collapsed() }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
        <span class="truncate">{props.item.name}</span>
      </button>

      <Show when={!collapsed()}>
        <ul class="ml-3 border-l border-border-primary">
          <For each={props.item.children}>
            {(child) => {
              const href = () => {
                if (props.isDocSection) return child.anchor;
                return withBase(`/reference${child.anchor}`);
              };
              const isActive = () => props.activeId === child.id;

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
                    {child.name}
                  </a>
                </li>
              );
            }}
          </For>
        </ul>
      </Show>
    </li>
  );
}

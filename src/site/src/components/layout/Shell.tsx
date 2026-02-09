import { type JSX, createSignal, onMount, onCleanup } from "solid-js";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { SearchDialog } from "../search/SearchDialog";
import { SettingsPanel } from "./SettingsPanel";
import siteConfig from "../../data/site-config.json";
import { withBase } from "../../lib/base-path";

export function Shell(props: { children: JSX.Element }) {
  const [mobileMenuOpen, setMobileMenuOpen] = createSignal(false);
  const [searchOpen, setSearchOpen] = createSignal(false);

  onMount(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    onCleanup(() => document.removeEventListener("keydown", handler));
  });

  return (
    <div class="min-h-screen bg-bg-primary">
      {/* Top bar */}
      <header class="sticky top-0 z-40 flex items-center h-14 border-b border-border-primary bg-bg-secondary/80 backdrop-blur-sm px-4">
        <button
          class="lg:hidden mr-3 text-text-secondary hover:text-text-primary"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen())}
          aria-label="Toggle menu"
        >
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <a href={withBase("/")} class="flex items-center gap-2 text-text-primary font-semibold text-lg no-underline">
          <span class="text-accent-blue">⚡</span>
          <span>{siteConfig.title}</span>
        </a>

        <div class="flex-1" />

        <nav class="hidden md:flex items-center gap-4 mr-4">
          <a href={withBase("/")} class="text-sm text-text-secondary hover:text-text-primary no-underline transition-colors">Home</a>
          <a href={withBase("/reference")} class="text-sm text-text-secondary hover:text-text-primary no-underline transition-colors">Reference</a>
        </nav>

        <SettingsPanel />

        <button
          class="flex items-center gap-2 px-3 py-1.5 text-sm text-text-muted bg-bg-tertiary border border-border-primary rounded-lg hover:border-border-primary hover:text-text-secondary transition-colors ml-2"
          onClick={() => setSearchOpen(true)}
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span class="hidden sm:inline">Search...</span>
          <kbd class="hidden sm:inline-flex items-center px-1.5 py-0.5 text-xs bg-bg-primary rounded border border-border-primary">⌘K</kbd>
        </button>
      </header>

      <div class="flex">
        {/* Desktop sidebar */}
        <aside class="hidden lg:block w-64 shrink-0 border-r border-border-primary sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
          <Sidebar />
        </aside>

        {/* Mobile sidebar */}
        <MobileNav open={mobileMenuOpen()} onClose={() => setMobileMenuOpen(false)}>
          <Sidebar onNavigate={() => setMobileMenuOpen(false)} />
        </MobileNav>

        {/* Main content */}
        <main class="flex-1 min-w-0">
          {props.children}
        </main>
      </div>

      {/* Search dialog */}
      <SearchDialog open={searchOpen()} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

import { createSignal, Show, onMount, onCleanup } from "solid-js";
import { getEndpoint, setEndpoint, getToken, setToken } from "../../lib/auth-store";

export function SettingsPanel() {
  const [open, setOpen] = createSignal(false);
  const [endpoint, setEndpointVal] = createSignal("");
  const [token, setTokenVal] = createSignal("");
  let panelRef: HTMLDivElement | undefined;

  onMount(() => {
    setEndpointVal(getEndpoint());
    setTokenVal(getToken());

    const handler = (e: MouseEvent) => {
      if (open() && panelRef && !panelRef.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    onCleanup(() => document.removeEventListener("mousedown", handler));
  });

  const handleEndpointChange = (val: string) => {
    setEndpointVal(val);
    setEndpoint(val);
  };

  const handleTokenChange = (val: string) => {
    setTokenVal(val);
    setToken(val);
  };

  return (
    <div class="relative" ref={panelRef}>
      <button
        class="flex items-center p-1.5 text-text-muted hover:text-text-secondary transition-colors"
        onClick={() => setOpen(!open())}
        title="API Settings"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      <Show when={open()}>
        <div class="absolute right-0 top-full mt-2 w-80 bg-bg-secondary border border-border-primary rounded-lg shadow-lg z-50 p-4">
          <h3 class="text-sm font-semibold text-text-primary mb-3">API Settings</h3>

          <label class="block text-xs font-medium text-text-muted mb-1">Endpoint URL</label>
          <input
            type="url"
            class="w-full bg-bg-tertiary border border-border-primary rounded px-2.5 py-1.5 text-sm text-text-primary font-mono focus:outline-none focus:border-accent-blue mb-3"
            placeholder="https://api.example.com/graphql"
            value={endpoint()}
            onInput={(e) => handleEndpointChange(e.currentTarget.value)}
          />

          <label class="block text-xs font-medium text-text-muted mb-1">Bearer Token</label>
          <input
            type="password"
            class="w-full bg-bg-tertiary border border-border-primary rounded px-2.5 py-1.5 text-sm text-text-primary font-mono focus:outline-none focus:border-accent-blue"
            placeholder="your-token-here"
            value={token()}
            onInput={(e) => handleTokenChange(e.currentTarget.value)}
          />

          <p class="text-xs text-text-muted mt-3">Stored locally in your browser.</p>
        </div>
      </Show>
    </div>
  );
}

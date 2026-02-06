import { createSignal, Show } from "solid-js";
import siteConfig from "../../data/site-config.json";
import { getEndpoint, getToken } from "../../lib/auth-store";

export function PlaygroundToggle(props: {
  name: string;
  query: string;
  variables: Record<string, unknown> | null;
}) {
  const [active, setActive] = createSignal(false);
  const [queryText, setQueryText] = createSignal(props.query);
  const [varsText, setVarsText] = createSignal(
    props.variables ? JSON.stringify(props.variables, null, 2) : ""
  );
  const [result, setResult] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const resolveEndpoint = () => getEndpoint() || (siteConfig as any).endpoint || "";

  const execute = async () => {
    const endpoint = resolveEndpoint();
    if (!endpoint) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      const token = getToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const playgroundHeaders = (siteConfig as any).playgroundHeaders;
      if (playgroundHeaders) {
        Object.assign(headers, playgroundHeaders);
      }

      let variables: Record<string, unknown> | undefined;
      if (varsText().trim()) {
        variables = JSON.parse(varsText());
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          query: queryText(),
          variables,
        }),
      });

      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="mt-2">
      <Show when={!active()}>
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent-blue bg-accent-blue/10 rounded-md hover:bg-accent-blue/20 transition-colors"
          onClick={() => setActive(true)}
        >
          <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
          </svg>
          Try it
        </button>
      </Show>

      <Show when={active()}>
        <div class="border border-accent-blue/30 rounded-lg overflow-hidden">
          <div class="flex items-center justify-between px-3 py-1.5 bg-accent-blue/10 border-b border-accent-blue/30">
            <span class="text-xs font-medium text-accent-blue">Playground</span>
            <button
              class="text-xs text-text-muted hover:text-text-secondary"
              onClick={() => setActive(false)}
            >
              Close
            </button>
          </div>

          <div class="p-3 bg-bg-primary">
            <label class="text-xs font-medium text-text-muted mb-1 block">Query</label>
            <textarea
              class="w-full h-32 bg-bg-tertiary border border-border-primary rounded p-2 font-mono text-xs text-text-primary resize-y focus:outline-none focus:border-accent-blue"
              value={queryText()}
              onInput={(e) => setQueryText(e.currentTarget.value)}
            />

            <Show when={varsText()}>
              <label class="text-xs font-medium text-text-muted mb-1 mt-2 block">Variables</label>
              <textarea
                class="w-full h-20 bg-bg-tertiary border border-border-primary rounded p-2 font-mono text-xs text-text-primary resize-y focus:outline-none focus:border-accent-blue"
                value={varsText()}
                onInput={(e) => setVarsText(e.currentTarget.value)}
              />
            </Show>

            <button
              class="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-accent-blue rounded-md hover:bg-accent-blue/80 transition-colors disabled:opacity-50"
              onClick={execute}
              disabled={loading()}
            >
              {loading() ? "Executing..." : "Execute"}
            </button>

            <Show when={error()}>
              <div class="mt-2 p-2 bg-accent-red/10 border border-accent-red/30 rounded text-xs text-accent-red">
                {error()}
              </div>
            </Show>

            <Show when={result()}>
              <div class="mt-2">
                <label class="text-xs font-medium text-text-muted mb-1 block">Response</label>
                <pre class="p-2 bg-bg-tertiary border border-border-primary rounded overflow-x-auto text-xs text-text-primary">
                  <code>{result()}</code>
                </pre>
              </div>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  );
}

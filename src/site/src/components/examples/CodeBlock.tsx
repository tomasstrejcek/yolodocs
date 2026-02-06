import { createSignal, Show, createMemo } from "solid-js";
import { highlight } from "../../lib/syntax";

export function CodeBlock(props: {
  code: string;
  language: string;
  title?: string;
}) {
  const [copied, setCopied] = createSignal(false);

  const highlighted = createMemo(() => highlight(props.code, props.language));

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(props.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div class="rounded-lg border border-border-primary overflow-hidden mb-3">
      <Show when={props.title}>
        <div class="flex items-center justify-between px-3 py-1.5 bg-bg-tertiary border-b border-border-primary">
          <span class="text-xs font-medium text-text-muted">{props.title}</span>
          <button
            class="text-text-muted hover:text-text-secondary transition-colors p-1"
            onClick={copyToClipboard}
            title="Copy to clipboard"
          >
            <Show when={!copied()} fallback={
              <svg class="w-3.5 h-3.5 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            }>
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </Show>
          </button>
        </div>
      </Show>
      <pre class="p-3 overflow-x-auto bg-bg-code text-sm leading-relaxed">
        <code class={`language-${props.language}`} innerHTML={highlighted()} />
      </pre>
    </div>
  );
}

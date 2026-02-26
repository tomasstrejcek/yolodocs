import { createMemo, Show } from "solid-js";
import { marked } from "marked";
import { highlight } from "../../lib/syntax";
import { withBase } from "../../lib/base-path";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const renderer = new marked.Renderer();

renderer.code = function ({ text, lang }: { text: string; lang?: string }) {
  const language = lang || "";
  const highlighted = highlight(text, language);
  return `<pre><code class="language-${escapeHtml(language)}">${highlighted}</code></pre>`;
};

export function MarkdownPage(props: { content: string; title: string; slug?: string }) {
  const html = createMemo(() => {
    return marked.parse(props.content, { gfm: true, breaks: false, renderer }) as string;
  });

  const hasH1 = createMemo(() => /^#\s+/m.test(props.content));

  return (
    <div class="max-w-3xl mx-auto px-6 py-8">
      <Show when={!hasH1()}>
        <h1 class="text-3xl font-bold text-text-primary mb-6">{props.title}</h1>
      </Show>
      <div class="markdown-content" innerHTML={html()} />
      <Show when={props.slug}>
        <div class="mt-8 pt-4 border-t border-border-primary text-sm text-text-muted">
          <a href={withBase(`/${props.slug}.md`)} class="hover:text-text-secondary">View Markdown source</a>
          {" · "}
          <a href={withBase("/docs.json")} class="hover:text-text-secondary">Documentation index (JSON)</a>
        </div>
      </Show>
    </div>
  );
}

import { createMemo } from "solid-js";
import { marked } from "marked";
import { highlight } from "../../lib/syntax";

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

export function MarkdownPage(props: { content: string; title: string }) {
  const html = createMemo(() => {
    return marked.parse(props.content, { gfm: true, breaks: false, renderer }) as string;
  });

  return (
    <div class="max-w-3xl mx-auto px-6 py-8">
      <h1 class="text-3xl font-bold text-text-primary mb-6">{props.title}</h1>
      <div class="markdown-content" innerHTML={html()} />
    </div>
  );
}

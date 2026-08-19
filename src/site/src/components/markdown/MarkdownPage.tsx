import { createMemo, Show } from "solid-js";
import { marked } from "marked";
import { highlight } from "../../lib/syntax";
import { withBase } from "../../lib/base-path";
import { createHeadingSlugger } from "../../lib/heading-slug";
import siteConfig from "../../data/site-config.json";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// One renderer per parse: the slugger carries per-document state.
function createRenderer(): marked.Renderer {
  const renderer = new marked.Renderer();
  const slug = createHeadingSlugger();

  renderer.code = function ({ text, lang }: { text: string; lang?: string }) {
    const language = lang || "";
    const highlighted = highlight(text, language);
    return `<pre><code class="language-${escapeHtml(language)}">${highlighted}</code></pre>`;
  };

  // Heading ids make in-page anchors resolve and let Pagefind report which
  // section matched, instead of pointing every hit at the top of the page.
  renderer.heading = function (this: any, { tokens, depth, text }: any) {
    const id = slug(String(text ?? ""));
    return `<h${depth} id="${escapeHtml(id)}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
  };

  return renderer;
}

export function MarkdownPage(props: { content: string; title: string; slug?: string }) {
  const cfg = siteConfig as any;
  const html = createMemo(() => {
    return marked.parse(props.content, {
      gfm: true,
      breaks: false,
      renderer: createRenderer(),
    }) as string;
  });

  const hasH1 = createMemo(() => /^#\s+/m.test(props.content));

  return (
    <div class="max-w-3xl mx-auto px-6 py-8" data-pagefind-meta={`title:${props.title}`}>
      <Show when={!hasH1()}>
        <h1 class="text-3xl font-bold text-text-primary mb-6">{props.title}</h1>
      </Show>
      <div class="markdown-content" innerHTML={html()} />
      <Show when={props.slug}>
        <div
          data-pagefind-ignore
          class="mt-8 pt-4 border-t border-border-primary text-sm text-text-muted"
        >
          <a
            href={withBase(`/${props.slug}.md`)}
            target="_blank"
            rel="noopener"
            class="hover:text-text-secondary"
          >
            View Markdown source
          </a>
          {" · "}
          <a
            href={withBase("/docs.json")}
            target="_blank"
            rel="noopener"
            class="hover:text-text-secondary"
          >
            Documentation index (JSON)
          </a>
        </div>
      </Show>
      <div
        data-pagefind-ignore
        class="mt-8 pt-4 border-t border-border-primary text-sm text-text-muted text-center space-y-1"
      >
        <p>
          Generated with{" "}
          <a
            href="https://github.com/tomasstrejcek/yolodocs"
            target="_blank"
            rel="noopener"
            class="hover:text-text-secondary underline"
          >
            yolodocs
          </a>
          <Show when={cfg.yolodocsVersion}> v{cfg.yolodocsVersion}</Show>
        </p>
        <Show when={cfg.generatedAt}>
          <p>{new Date(cfg.generatedAt).toLocaleString()}</p>
        </Show>
      </div>
    </div>
  );
}

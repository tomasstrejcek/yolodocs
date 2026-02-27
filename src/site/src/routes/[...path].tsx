import { useLocation } from "@solidjs/router";
import { Show, createMemo, createResource, createEffect } from "solid-js";
import { Shell } from "../components/layout/Shell";
import { MarkdownPage } from "../components/markdown/MarkdownPage";
import docsManifest from "../data/docs-manifest.json";
import siteConfig from "../data/site-config.json";
import { base, withBase } from "../lib/base-path";

// Lazy-load individual doc page content to avoid bundling all markdown
// into one large JSON module (which breaks Nitro prerender in Docker)
const contentModules = import.meta.glob<string>(
  "../data/docs-pages/**/*.js",
  { import: "default" }
);

async function loadContent(slug: string): Promise<string> {
  const key = `../data/docs-pages/${slug}.js`;
  const loader = contentModules[key];
  if (!loader) return "";
  return (await loader()) as string;
}

export default function DocsPage() {
  // Use useLocation() instead of useParams() — catch-all params from
  // useParams() don't reliably trigger reactivity when navigating between
  // pages that match the same [...path] route in @solidjs/router 0.15.x.
  const location = useLocation();

  const slug = createMemo(() => {
    let pathname = location.pathname;
    if (base && pathname.startsWith(base)) {
      pathname = pathname.slice(base.length);
    }
    if (pathname.startsWith("/")) pathname = pathname.slice(1);
    if (pathname.endsWith(".html")) pathname = pathname.slice(0, -5);
    return pathname;
  });

  const page = createMemo(() => {
    return (docsManifest as any).pages?.find(
      (p: any) => p.slug === slug()
    );
  });

  const [content] = createResource(slug, loadContent);

  createEffect(() => {
    const p = page();
    if (typeof document !== "undefined" && p) {
      document.title = `${p.title} — ${(siteConfig as any).title}`;
    }
  });

  return (
    <Shell>
      <Show
        when={page()}
        fallback={
          <div class="max-w-3xl mx-auto px-6 py-8">
            <h1 class="text-2xl font-bold text-text-primary mb-4">Page Not Found</h1>
            <p class="text-text-secondary">
              The documentation page you're looking for doesn't exist.
            </p>
            <a href={withBase("/")} class="text-accent-blue hover:underline mt-4 inline-block">
              Go back home
            </a>
          </div>
        }
      >
        <MarkdownPage title={page()!.title} content={content() || ""} slug={slug()} />
      </Show>
    </Shell>
  );
}

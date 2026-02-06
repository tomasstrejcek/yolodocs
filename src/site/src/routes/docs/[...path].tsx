import { useParams } from "@solidjs/router";
import { Show, createMemo } from "solid-js";
import { Shell } from "../../components/layout/Shell";
import { MarkdownPage } from "../../components/markdown/MarkdownPage";
import docsManifest from "../../data/docs-manifest.json";

export default function DocsPage() {
  const params = useParams();

  const page = createMemo(() => {
    const slug = params.path || "";
    return (docsManifest as any).pages?.find(
      (p: any) => p.slug === slug
    );
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
            <a href="/" class="text-accent-blue hover:underline mt-4 inline-block">
              Go back home
            </a>
          </div>
        }
      >
        <MarkdownPage title={page()!.title} content={page()!.content} />
      </Show>
    </Shell>
  );
}

import { Show } from "solid-js";
import schema from "../../data/schema.json";
import siteConfig from "../../data/site-config.json";
import docsManifest from "../../data/docs-manifest.json";
import { CategoryCard } from "./CategoryCard";
import { withBase } from "../../lib/base-path";

export function WelcomePage() {
  const s = schema as any;
  const cfg = siteConfig as any;
  const docs = docsManifest as any;

  return (
    <div class="max-w-4xl mx-auto px-6 py-12">
      <div class="mb-10">
        <h1 class="text-4xl font-bold text-text-primary mb-3">
          {cfg.title}
        </h1>
        <Show when={cfg.description}>
          <p class="text-lg text-text-secondary">{cfg.description}</p>
        </Show>
        <Show when={cfg.version}>
          <p class="text-sm text-text-muted mt-2">Version {cfg.version}</p>
        </Show>
        <Show when={cfg.endpoint}>
          <p class="text-sm text-text-muted mt-1">
            Endpoint:{" "}
            <code class="text-xs bg-bg-tertiary px-1.5 py-0.5 rounded text-accent-blue">
              {cfg.endpoint}
            </code>
          </p>
        </Show>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-10">
        <Show when={(s.queries || []).length > 0}>
          <CategoryCard
            title="Queries"
            count={(s.queries || []).length}
            label="queries"
            color="text-accent-green"
            href={withBase("/reference#queries")}
            icon="Q"
          />
        </Show>

        <Show when={(s.mutations || []).length > 0}>
          <CategoryCard
            title="Mutations"
            count={(s.mutations || []).length}
            label="mutations"
            color="text-accent-orange"
            href={withBase("/reference#mutations")}
            icon="M"
          />
        </Show>

        <Show when={(s.types || []).length > 0}>
          <CategoryCard
            title="Types"
            count={(s.types || []).length}
            label="types"
            color="text-accent-blue"
            href={withBase("/reference#types")}
            icon="T"
          />
        </Show>

        <Show when={(s.enums || []).length > 0}>
          <CategoryCard
            title="Enums"
            count={(s.enums || []).length}
            label="enums"
            color="text-accent-purple"
            href={withBase("/reference#enums")}
            icon="E"
          />
        </Show>

        <Show when={(s.inputs || []).length > 0}>
          <CategoryCard
            title="Inputs"
            count={(s.inputs || []).length}
            label="input types"
            color="text-accent-orange"
            href={withBase("/reference#inputs")}
            icon="I"
          />
        </Show>

        <Show when={(s.interfaces || []).length > 0}>
          <CategoryCard
            title="Interfaces"
            count={(s.interfaces || []).length}
            label="interfaces"
            color="text-syntax-type"
            href={withBase("/reference#interfaces")}
            icon="IF"
          />
        </Show>

        <Show when={(s.unions || []).length > 0}>
          <CategoryCard
            title="Unions"
            count={(s.unions || []).length}
            label="unions"
            color="text-syntax-variable"
            href={withBase("/reference#unions")}
            icon="U"
          />
        </Show>

        <Show when={(s.scalars || []).length > 0}>
          <CategoryCard
            title="Scalars"
            count={(s.scalars || []).length}
            label="custom scalars"
            color="text-text-muted"
            href={withBase("/reference#scalars")}
            icon="S"
          />
        </Show>

        <Show when={(docs.pages || []).length > 0}>
          <CategoryCard
            title="Guides"
            count={(docs.pages || []).length}
            label="pages"
            color="text-accent-blue"
            href={withBase(`/${(docs.pages || [])[0]?.slug || ""}.html`)}
            icon="G"
          />
        </Show>
      </div>

      <div class="border-t border-border-primary pt-6 text-sm text-text-muted text-center space-y-1">
        <p>
          <a href={withBase("/docs.json")} target="_blank" rel="noopener" class="hover:text-text-secondary">docs.json</a>
        </p>
        <p>
          Generated with <a href="https://github.com/tomasstrejcek/yolodocs" target="_blank" rel="noopener" class="hover:text-text-secondary underline">yolodocs</a>
        </p>
      </div>
    </div>
  );
}

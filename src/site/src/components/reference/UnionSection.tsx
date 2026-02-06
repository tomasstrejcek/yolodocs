import { For, Show } from "solid-js";
import schema from "../../data/schema.json";
import { DescriptionBlock } from "./DescriptionBlock";

export function UnionSection() {
  const unions = (schema as any).unions || [];

  return (
    <Show when={unions.length > 0}>
      <section class="mb-12 px-6 py-6 xl:px-8">
        <h2 class="text-2xl font-bold text-text-primary mb-1 flex items-center gap-2">
          <span class="text-syntax-variable">●</span> Unions
        </h2>
        <p class="text-sm text-text-secondary mb-6">
          {unions.length} {unions.length === 1 ? "union" : "unions"}
        </p>

        <For each={unions}>
          {(union: any) => (
            <div
              id={`union-${union.name}`}
              class="mb-8 pb-8 border-b border-border-secondary last:border-b-0 scroll-mt-16"
            >
              <h3 class="text-lg font-semibold text-text-primary font-mono">
                {union.name}
              </h3>

              <DescriptionBlock text={union.description} />

              <div class="mt-3">
                <span class="text-xs font-semibold uppercase tracking-wider text-text-muted">Possible types: </span>
                <div class="mt-1 flex flex-wrap gap-2">
                  <For each={union.types || []}>
                    {(typeName: string) => (
                      <a
                        href={`/reference#type-${typeName}`}
                        class="inline-flex px-2 py-0.5 text-sm font-mono text-accent-blue bg-accent-blue/10 rounded hover:bg-accent-blue/20 no-underline transition-colors"
                      >
                        {typeName}
                      </a>
                    )}
                  </For>
                </div>
              </div>
            </div>
          )}
        </For>
      </section>
    </Show>
  );
}

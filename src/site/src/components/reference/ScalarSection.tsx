import { For, Show } from "solid-js";
import schema from "../../data/schema.json";
import { DescriptionBlock } from "./DescriptionBlock";

export function ScalarSection() {
  const scalars = (schema as any).scalars || [];

  return (
    <Show when={scalars.length > 0}>
      <section class="mb-12 px-6 py-6 xl:px-8">
        <h2 class="text-2xl font-bold text-text-primary mb-1 flex items-center gap-2">
          <span class="text-text-muted">●</span> Scalars
        </h2>
        <p class="text-sm text-text-secondary mb-6">
          {scalars.length} custom {scalars.length === 1 ? "scalar" : "scalars"}
        </p>

        <div class="grid gap-3 sm:grid-cols-2">
          <For each={scalars}>
            {(scalar: any) => (
              <div
                id={`scalar-${scalar.name}`}
                class="p-4 border border-border-primary rounded-lg bg-bg-secondary/30 scroll-mt-16"
              >
                <h3 class="text-base font-semibold text-text-primary font-mono">
                  {scalar.name}
                </h3>
                <DescriptionBlock text={scalar.description} />
              </div>
            )}
          </For>
        </div>
      </section>
    </Show>
  );
}

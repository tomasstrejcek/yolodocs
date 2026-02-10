import { For, Show } from "solid-js";
import schema from "../../data/schema.json";
import { FieldTable } from "./FieldTable";
import { DescriptionBlock } from "./DescriptionBlock";

export function InputSection() {
  const inputs = (schema as any).inputs || [];

  return (
    <Show when={inputs.length > 0}>
      <section id="inputs" class="mb-12 px-6 py-6 xl:px-8 scroll-mt-14">
        <h2 class="text-2xl font-bold text-text-primary mb-1 flex items-center gap-2">
          <span class="text-accent-orange">●</span> Input Types
        </h2>
        <p class="text-sm text-text-secondary mb-6">
          {inputs.length} input {inputs.length === 1 ? "type" : "types"}
        </p>

        <For each={inputs}>
          {(input: any) => (
            <div
              id={`input-${input.name}`}
              class="mb-8 pb-8 border-b border-border-secondary last:border-b-0 scroll-mt-16"
            >
              <h3 class="text-lg font-semibold text-text-primary font-mono">
                {input.name}
              </h3>

              <DescriptionBlock text={input.description} />

              <FieldTable fields={input.fields || []} title="Fields" />
            </div>
          )}
        </For>
      </section>
    </Show>
  );
}

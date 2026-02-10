import { For, Show } from "solid-js";
import schema from "../../data/schema.json";
import { FieldTable } from "./FieldTable";
import { DescriptionBlock } from "./DescriptionBlock";
import { withBase } from "../../lib/base-path";

export function TypeSection() {
  const types = (schema as any).types || [];

  return (
    <Show when={types.length > 0}>
      <section id="types" class="mb-12 px-6 py-6 xl:px-8 scroll-mt-14">
        <h2 class="text-2xl font-bold text-text-primary mb-1 flex items-center gap-2">
          <span class="text-accent-blue">●</span> Types
        </h2>
        <p class="text-sm text-text-secondary mb-6">
          {types.length} object {types.length === 1 ? "type" : "types"}
        </p>

        <For each={types}>
          {(type: any) => (
            <div
              id={`type-${type.name}`}
              class="mb-8 pb-8 border-b border-border-secondary last:border-b-0 scroll-mt-16"
            >
              <h3 class="text-lg font-semibold text-text-primary font-mono">
                {type.name}
              </h3>

              <Show when={type.interfaces?.length > 0}>
                <p class="text-sm text-text-muted mt-1">
                  Implements:{" "}
                  <For each={type.interfaces}>
                    {(iface: string, i) => (
                      <>
                        <a
                          href={withBase(`/reference#interface-${iface}`)}
                          class="text-accent-blue hover:underline no-underline"
                        >
                          {iface}
                        </a>
                        {i() < type.interfaces.length - 1 ? ", " : ""}
                      </>
                    )}
                  </For>
                </p>
              </Show>

              <DescriptionBlock text={type.description} />

              <FieldTable fields={type.fields || []} title="Fields" />
            </div>
          )}
        </For>
      </section>
    </Show>
  );
}

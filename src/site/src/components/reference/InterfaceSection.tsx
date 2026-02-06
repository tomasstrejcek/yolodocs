import { For, Show } from "solid-js";
import schema from "../../data/schema.json";
import { FieldTable } from "./FieldTable";
import { DescriptionBlock } from "./DescriptionBlock";

export function InterfaceSection() {
  const interfaces = (schema as any).interfaces || [];

  return (
    <Show when={interfaces.length > 0}>
      <section class="mb-12 px-6 py-6 xl:px-8">
        <h2 class="text-2xl font-bold text-text-primary mb-1 flex items-center gap-2">
          <span class="text-syntax-type">●</span> Interfaces
        </h2>
        <p class="text-sm text-text-secondary mb-6">
          {interfaces.length} {interfaces.length === 1 ? "interface" : "interfaces"}
        </p>

        <For each={interfaces}>
          {(iface: any) => (
            <div
              id={`interface-${iface.name}`}
              class="mb-8 pb-8 border-b border-border-secondary last:border-b-0 scroll-mt-16"
            >
              <h3 class="text-lg font-semibold text-text-primary font-mono">
                {iface.name}
              </h3>

              <DescriptionBlock text={iface.description} />

              <Show when={iface.implementations?.length > 0}>
                <div class="mt-2">
                  <span class="text-xs font-semibold uppercase tracking-wider text-text-muted">Implemented by: </span>
                  <For each={iface.implementations}>
                    {(impl: string, i) => (
                      <>
                        <a
                          href={`/reference#type-${impl}`}
                          class="text-sm text-accent-blue hover:underline no-underline"
                        >
                          {impl}
                        </a>
                        {i() < iface.implementations.length - 1 ? ", " : ""}
                      </>
                    )}
                  </For>
                </div>
              </Show>

              <FieldTable fields={iface.fields || []} title="Fields" />
            </div>
          )}
        </For>
      </section>
    </Show>
  );
}

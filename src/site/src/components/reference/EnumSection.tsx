import { For, Show } from "solid-js";
import schema from "../../data/schema.json";
import { DeprecationBadge } from "./DeprecationBadge";
import { DescriptionBlock } from "./DescriptionBlock";

export function EnumSection() {
  const enums = (schema as any).enums || [];

  return (
    <Show when={enums.length > 0}>
      <section id="enums" class="mb-12 px-6 py-6 xl:px-8 scroll-mt-14">
        <h2 class="text-2xl font-bold text-text-primary mb-1 flex items-center gap-2">
          <span class="text-accent-purple">●</span> Enums
        </h2>
        <p class="text-sm text-text-secondary mb-6">
          {enums.length} {enums.length === 1 ? "enum" : "enums"}
        </p>

        <For each={enums}>
          {(enumDef: any) => (
            <div
              id={`enum-${enumDef.name}`}
              class="mb-8 pb-8 border-b border-border-secondary last:border-b-0 scroll-mt-16"
            >
              <h3 class="text-lg font-semibold text-text-primary font-mono">
                {enumDef.name}
              </h3>

              <DescriptionBlock text={enumDef.description} />

              <div class="mt-3 border border-border-primary rounded-lg overflow-hidden">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="bg-bg-tertiary">
                      <th class="text-left px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider">Value</th>
                      <th class="text-left px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider hidden md:table-cell">Description</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border-secondary">
                    <For each={enumDef.values || []}>
                      {(value: any) => (
                        <tr class="hover:bg-bg-hover/50 transition-colors">
                          <td class="px-3 py-2 font-mono text-sm text-syntax-string">
                            {value.name}
                          </td>
                          <td class="px-3 py-2 text-text-secondary hidden md:table-cell">
                            <Show when={value.isDeprecated}>
                              <DeprecationBadge reason={value.deprecationReason} />
                              {" "}
                            </Show>
                            {value.description}
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </For>
      </section>
    </Show>
  );
}

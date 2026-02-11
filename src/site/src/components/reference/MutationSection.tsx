import { For, Show } from "solid-js";
import schema from "../../data/schema.json";
import examples from "../../data/examples.json";
import { ArgsTable } from "./FieldTable";
import { TypeLink } from "./TypeLink";
import { DeprecationBadge } from "./DeprecationBadge";
import { DescriptionBlock } from "./DescriptionBlock";
import { ExamplePanel } from "../examples/ExamplePanel";
import { OperationNav } from "./OperationNav";

export function MutationSection() {
  const mutations = (schema as any).mutations || [];

  return (
    <Show when={mutations.length > 0}>
      <section id="mutations" class="mb-12 scroll-mt-14">
        <div class="px-6 py-6 xl:px-8">
          <h2 class="text-2xl font-bold text-text-primary mb-1 flex items-center gap-2">
            Mutations
          </h2>
          <p class="text-sm text-text-secondary mb-6">
            {mutations.length} {mutations.length === 1 ? "mutation" : "mutations"} available
          </p>
        </div>

        <For each={mutations}>
          {(mutation: any, i) => {
            const example = (examples as any).operations?.[mutation.name];
            const prev = i() > 0 ? mutations[i() - 1] : null;
            const next = i() < mutations.length - 1 ? mutations[i() + 1] : null;
            return (
              <div class="flex flex-col xl:flex-row border-b border-border-secondary last:border-b-0">
                <div
                  id={`mutation-${mutation.name}`}
                  class="flex-1 min-w-0 px-6 py-6 xl:px-8 xl:max-w-[55%] scroll-mt-16"
                >
                  <h3 class="text-lg font-semibold text-text-primary font-mono flex items-center gap-2 flex-wrap">
                    {mutation.name}
                    <span class="px-2 py-0.5 text-xs font-medium rounded bg-accent-red/15 text-accent-red font-sans">
                      Mutation
                    </span>
                    <Show when={mutation.isDeprecated}>
                      <DeprecationBadge reason={mutation.deprecationReason} />
                    </Show>
                  </h3>

                  <DescriptionBlock text={mutation.description} />

                  <div class="mt-2 flex items-center gap-2 text-sm">
                    <span class="text-text-muted">Returns:</span>
                    <TypeLink type={mutation.type} />
                  </div>

                  <ArgsTable args={mutation.args || []} />

                  <OperationNav
                    prev={prev ? { name: prev.name, anchor: `mutation-${prev.name}` } : undefined}
                    next={next ? { name: next.name, anchor: `mutation-${next.name}` } : undefined}
                  />
                </div>

                <div class="xl:w-[45%] shrink-0 border-t xl:border-t-0 xl:border-l border-border-primary bg-bg-secondary/50 px-6 py-6">
                  <Show when={example}>
                    <ExamplePanel name={mutation.name} example={example} />
                  </Show>
                </div>
              </div>
            );
          }}
        </For>
      </section>
    </Show>
  );
}

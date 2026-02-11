import { For, Show } from "solid-js";
import schema from "../../data/schema.json";
import examples from "../../data/examples.json";
import { ArgsTable } from "./FieldTable";
import { TypeLink } from "./TypeLink";
import { DeprecationBadge } from "./DeprecationBadge";
import { DescriptionBlock } from "./DescriptionBlock";
import { ExamplePanel } from "../examples/ExamplePanel";
import { OperationNav } from "./OperationNav";

export function QuerySection() {
  const queries = (schema as any).queries || [];

  return (
    <Show when={queries.length > 0}>
      <section id="queries" class="mb-12 scroll-mt-14">
        <div class="px-6 py-6 xl:px-8">
          <h2 class="text-2xl font-bold text-text-primary mb-1 flex items-center gap-2">
            Queries
          </h2>
          <p class="text-sm text-text-secondary mb-6">
            {queries.length} {queries.length === 1 ? "query" : "queries"} available
          </p>
        </div>

        <For each={queries}>
          {(query: any, i) => {
            const example = (examples as any).operations?.[query.name];
            const prev = i() > 0 ? queries[i() - 1] : null;
            const next = i() < queries.length - 1 ? queries[i() + 1] : null;
            return (
              <div class="flex flex-col xl:flex-row border-b border-border-secondary last:border-b-0">
                <div
                  id={`query-${query.name}`}
                  class="flex-1 min-w-0 px-6 py-6 xl:px-8 xl:max-w-[55%] scroll-mt-16"
                >
                  <h3 class="text-lg font-semibold text-text-primary font-mono flex items-center gap-2 flex-wrap">
                    {query.name}
                    <span class="px-2 py-0.5 text-xs font-medium rounded bg-accent-green/15 text-accent-green font-sans">
                      Query
                    </span>
                    <Show when={query.isDeprecated}>
                      <DeprecationBadge reason={query.deprecationReason} />
                    </Show>
                  </h3>

                  <DescriptionBlock text={query.description} />

                  <div class="mt-2 flex items-center gap-2 text-sm">
                    <span class="text-text-muted">Returns:</span>
                    <TypeLink type={query.type} />
                  </div>

                  <ArgsTable args={query.args || []} />

                  <OperationNav
                    prev={prev ? { name: prev.name, anchor: `query-${prev.name}` } : undefined}
                    next={next ? { name: next.name, anchor: `query-${next.name}` } : undefined}
                  />
                </div>

                <div class="xl:w-[45%] shrink-0 border-t xl:border-t-0 xl:border-l border-border-primary bg-bg-secondary/50 px-6 py-6">
                  <Show when={example}>
                    <ExamplePanel name={query.name} example={example} />
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

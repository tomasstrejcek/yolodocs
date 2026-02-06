import { For, Show } from "solid-js";
import { TypeLink } from "./TypeLink";
import { DeprecationBadge } from "./DeprecationBadge";

interface FieldDef {
  name: string;
  description: string | null;
  type: { name: string; kind: string; ofType: any };
  isDeprecated?: boolean;
  deprecationReason?: string | null;
  defaultValue?: string | null;
}

interface ArgDef {
  name: string;
  description: string | null;
  type: { name: string; kind: string; ofType: any };
  defaultValue?: string | null;
  isDeprecated?: boolean;
  deprecationReason?: string | null;
}

export function FieldTable(props: {
  fields: FieldDef[];
  title?: string;
}) {
  return (
    <div class="mt-3">
      <Show when={props.title}>
        <h4 class="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
          {props.title}
        </h4>
      </Show>
      <div class="border border-border-primary rounded-lg overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-bg-tertiary">
              <th class="text-left px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider">Name</th>
              <th class="text-left px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider">Type</th>
              <th class="text-left px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider hidden md:table-cell">Description</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border-secondary">
            <For each={props.fields}>
              {(field) => (
                <tr class="hover:bg-bg-hover/50 transition-colors">
                  <td class="px-3 py-2 font-mono text-sm text-text-primary whitespace-nowrap">
                    <span>{field.name}</span>
                    <Show when={field.defaultValue != null}>
                      <span class="text-text-muted ml-1">
                        = <span class="text-syntax-string">{field.defaultValue}</span>
                      </span>
                    </Show>
                  </td>
                  <td class="px-3 py-2 whitespace-nowrap">
                    <TypeLink type={field.type} />
                  </td>
                  <td class="px-3 py-2 text-text-secondary hidden md:table-cell">
                    <Show when={field.isDeprecated}>
                      <DeprecationBadge reason={field.deprecationReason || null} />
                    </Show>
                    <Show when={field.description}>
                      <span class="text-sm">{field.description}</span>
                    </Show>
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ArgsTable(props: {
  args: ArgDef[];
}) {
  return (
    <Show when={props.args.length > 0}>
      <div class="mt-3">
        <h4 class="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Arguments</h4>
        <div class="border border-border-primary rounded-lg overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-bg-tertiary">
                <th class="text-left px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider">Argument</th>
                <th class="text-left px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider">Type</th>
                <th class="text-left px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider hidden md:table-cell">Description</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border-secondary">
              <For each={props.args}>
                {(arg) => (
                  <tr class="hover:bg-bg-hover/50 transition-colors">
                    <td class="px-3 py-2 font-mono text-sm text-syntax-variable whitespace-nowrap">
                      {arg.name}
                      <Show when={arg.defaultValue != null}>
                        <span class="text-text-muted ml-1">
                          = <span class="text-syntax-string">{arg.defaultValue}</span>
                        </span>
                      </Show>
                    </td>
                    <td class="px-3 py-2 whitespace-nowrap">
                      <TypeLink type={arg.type} />
                    </td>
                    <td class="px-3 py-2 text-text-secondary hidden md:table-cell">
                      <Show when={arg.isDeprecated}>
                        <DeprecationBadge reason={arg.deprecationReason || null} />
                      </Show>
                      <Show when={arg.description}>
                        <span class="text-sm">{arg.description}</span>
                      </Show>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </div>
    </Show>
  );
}

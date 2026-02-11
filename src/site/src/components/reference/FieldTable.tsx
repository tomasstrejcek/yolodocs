import { For, Show } from "solid-js";
import { TypeBadge } from "./TypeBadge";
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
      <div class="border border-border-primary rounded-lg">
        <For each={props.fields}>
          {(field, i) => (
            <div
              class="px-3 py-2.5"
              classList={{ "border-b border-border-secondary": i() < props.fields.length - 1 }}
            >
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-mono text-sm font-semibold text-text-primary">
                  {field.name}
                </span>
                <Show when={field.defaultValue != null}>
                  <span class="text-text-muted text-sm">
                    = <span class="text-syntax-string">{field.defaultValue}</span>
                  </span>
                </Show>
                <TypeBadge type={field.type} />
                <Show when={field.isDeprecated}>
                  <DeprecationBadge reason={field.deprecationReason || null} />
                </Show>
              </div>
              <Show when={field.description}>
                <p class="mt-1 text-sm text-text-secondary">{field.description}</p>
              </Show>
            </div>
          )}
        </For>
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
        <div class="border border-border-primary rounded-lg">
          <For each={props.args}>
            {(arg, i) => (
              <div
                class="px-3 py-2.5"
                classList={{ "border-b border-border-secondary": i() < props.args.length - 1 }}
              >
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-mono text-sm font-semibold text-syntax-variable">
                    {arg.name}
                  </span>
                  <Show when={arg.defaultValue != null}>
                    <span class="text-text-muted text-sm">
                      = <span class="text-syntax-string">{arg.defaultValue}</span>
                    </span>
                  </Show>
                  <TypeBadge type={arg.type} />
                  <Show when={arg.isDeprecated}>
                    <DeprecationBadge reason={arg.deprecationReason || null} />
                  </Show>
                </div>
                <Show when={arg.description}>
                  <p class="mt-1 text-sm text-text-secondary">{arg.description}</p>
                </Show>
              </div>
            )}
          </For>
        </div>
      </div>
    </Show>
  );
}

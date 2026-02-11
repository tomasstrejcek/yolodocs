import { Show } from "solid-js";

export function OperationNav(props: {
  prev?: { name: string; anchor: string };
  next?: { name: string; anchor: string };
}) {
  return (
    <Show when={props.prev || props.next}>
      <div class="mt-6 pt-4 border-t border-border-secondary flex items-center justify-between gap-4">
        <Show when={props.prev} fallback={<span />}>
          <a
            href={`#${props.prev!.anchor}`}
            class="text-sm text-text-muted hover:text-text-primary transition-colors no-underline"
          >
            <span class="text-text-muted">&larr;</span>{" "}
            <span class="font-mono text-xs">{props.prev!.name}</span>
          </a>
        </Show>
        <Show when={props.next} fallback={<span />}>
          <a
            href={`#${props.next!.anchor}`}
            class="text-sm text-text-muted hover:text-text-primary transition-colors no-underline"
          >
            <span class="font-mono text-xs">{props.next!.name}</span>{" "}
            <span class="text-text-muted">&rarr;</span>
          </a>
        </Show>
      </div>
    </Show>
  );
}

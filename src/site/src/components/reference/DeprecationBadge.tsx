import { Show } from "solid-js";

export function DeprecationBadge(props: {
  reason: string | null;
}) {
  return (
    <span
      class="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-accent-orange/15 text-accent-orange rounded"
      title={props.reason || "Deprecated"}
    >
      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
      Deprecated
      <Show when={props.reason}>
        <span class="hidden sm:inline text-accent-orange/70">- {props.reason}</span>
      </Show>
    </span>
  );
}

import { Show } from "solid-js";

export function DescriptionBlock(props: { text: string | null }) {
  return (
    <Show when={props.text}>
      <p class="text-sm text-text-secondary leading-relaxed mt-1 mb-3 whitespace-pre-line">
        {props.text}
      </p>
    </Show>
  );
}

import type { JSX } from "solid-js";

export function ThreeColumn(props: {
  docs: JSX.Element;
  examples: JSX.Element;
}) {
  return (
    <div class="flex flex-col xl:flex-row">
      <div class="flex-1 min-w-0 px-6 py-6 xl:px-8 xl:max-w-[55%]">
        {props.docs}
      </div>
      <div class="xl:w-[45%] shrink-0 border-t xl:border-t-0 xl:border-l border-border-primary bg-bg-secondary/50 px-6 py-6">
        {props.examples}
      </div>
    </div>
  );
}

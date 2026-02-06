import { type JSX, Show } from "solid-js";

export function MobileNav(props: {
  open: boolean;
  onClose: () => void;
  children: JSX.Element;
}) {
  return (
    <Show when={props.open}>
      {/* Backdrop */}
      <div
        class="fixed inset-0 z-30 bg-black/50 lg:hidden"
        onClick={props.onClose}
      />
      {/* Drawer */}
      <div class="fixed inset-y-0 left-0 z-30 w-72 bg-bg-secondary border-r border-border-primary overflow-y-auto lg:hidden pt-14">
        {props.children}
      </div>
    </Show>
  );
}

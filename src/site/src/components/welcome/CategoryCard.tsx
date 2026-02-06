export function CategoryCard(props: {
  title: string;
  count: number;
  label: string;
  color: string;
  href: string;
  icon: string;
}) {
  return (
    <a
      href={props.href}
      class="group block p-5 bg-bg-secondary border border-border-primary rounded-xl hover:border-border-primary hover:bg-bg-tertiary transition-all no-underline"
    >
      <div class="flex items-center gap-3 mb-2">
        <span class={`text-2xl ${props.color}`}>{props.icon}</span>
        <h3 class="text-lg font-semibold text-text-primary group-hover:text-accent-blue transition-colors">
          {props.title}
        </h3>
      </div>
      <p class="text-2xl font-bold text-text-primary">
        {props.count}
        <span class="text-sm font-normal text-text-muted ml-1.5">{props.label}</span>
      </p>
    </a>
  );
}

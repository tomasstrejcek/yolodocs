import schema from "../../data/schema.json";
import { withBase } from "../../lib/base-path";

interface TypeRef {
  name: string;
  kind: string;
  ofType: TypeRef | null;
}

function getNamedTypeKind(name: string): string {
  const s = schema as any;
  if (s.scalars?.some((sc: any) => sc.name === name)) return "SCALAR";
  if (s.enums?.some((e: any) => e.name === name)) return "ENUM";
  if (s.types?.some((t: any) => t.name === name)) return "OBJECT";
  if (s.interfaces?.some((i: any) => i.name === name)) return "INTERFACE";
  if (s.unions?.some((u: any) => u.name === name)) return "UNION";
  if (s.inputs?.some((i: any) => i.name === name)) return "INPUT_OBJECT";
  return "SCALAR";
}

function getTypeAnchor(name: string): string | null {
  const s = schema as any;
  if (s.types?.some((t: any) => t.name === name)) return `type-${name}`;
  if (s.enums?.some((e: any) => e.name === name)) return `enum-${name}`;
  if (s.interfaces?.some((i: any) => i.name === name)) return `interface-${name}`;
  if (s.unions?.some((u: any) => u.name === name)) return `union-${name}`;
  if (s.inputs?.some((i: any) => i.name === name)) return `input-${name}`;
  if (s.scalars?.some((sc: any) => sc.name === name)) return `scalar-${name}`;
  return null;
}

function kindColor(kind: string): string {
  switch (kind) {
    case "SCALAR":
      return "bg-accent-green/15 text-accent-green";
    case "ENUM":
      return "bg-accent-purple/15 text-accent-purple";
    default:
      return "bg-accent-blue/15 text-accent-blue";
  }
}

export function TypeBadge(props: { type: TypeRef }) {
  const parts = unwrapType(props.type);
  return (
    <span class="inline-flex items-center gap-1 flex-wrap">
      {parts}
    </span>
  );
}

function unwrapType(ref: TypeRef): any {
  if (ref.kind === "NON_NULL") {
    const inner = unwrapType(ref.ofType!);
    return (
      <>
        {inner}
        <span class="px-1.5 py-0.5 text-xs font-mono font-medium rounded bg-accent-orange/15 text-accent-orange">
          !
        </span>
      </>
    );
  }
  if (ref.kind === "LIST") {
    const inner = unwrapType(ref.ofType!);
    return (
      <span class="inline-flex items-center gap-0.5">
        <span class="text-text-muted font-mono text-xs">[</span>
        {inner}
        <span class="text-text-muted font-mono text-xs">]</span>
      </span>
    );
  }

  const kind = ref.kind === "OBJECT" || ref.kind === "ENUM" || ref.kind === "SCALAR" ||
    ref.kind === "INTERFACE" || ref.kind === "UNION" || ref.kind === "INPUT_OBJECT"
    ? ref.kind
    : getNamedTypeKind(ref.name);
  const color = kindColor(kind);
  const anchor = getTypeAnchor(ref.name);

  if (anchor) {
    return (
      <a
        href={withBase(`/reference#${anchor}`)}
        class={`px-2 py-0.5 text-xs font-mono font-medium rounded hover:underline no-underline ${color}`}
      >
        {ref.name}
      </a>
    );
  }

  return (
    <span class={`px-2 py-0.5 text-xs font-mono font-medium rounded ${color}`}>
      {ref.name}
    </span>
  );
}

import schema from "../../data/schema.json";
import { withBase } from "../../lib/base-path";

interface TypeRef {
  name: string;
  kind: string;
  ofType: TypeRef | null;
}

export function TypeLink(props: { type: TypeRef }) {
  return <span class="font-mono text-sm">{renderTypeRef(props.type)}</span>;
}

function renderTypeRef(ref: TypeRef): any {
  if (ref.kind === "NON_NULL") {
    return <>{renderTypeRef(ref.ofType!)}!</>;
  }
  if (ref.kind === "LIST") {
    return <>[{renderTypeRef(ref.ofType!)}]</>;
  }

  const isLinkable = isLinkableType(ref.name);

  if (isLinkable) {
    const anchor = getTypeAnchor(ref.name);
    return (
      <a
        href={withBase(`/reference#${anchor}`)}
        class="text-accent-blue hover:underline no-underline"
      >
        {ref.name}
      </a>
    );
  }

  return <span class="text-syntax-type">{ref.name}</span>;
}

function isLinkableType(name: string): boolean {
  const s = schema as any;
  return (
    s.types?.some((t: any) => t.name === name) ||
    s.enums?.some((e: any) => e.name === name) ||
    s.interfaces?.some((i: any) => i.name === name) ||
    s.unions?.some((u: any) => u.name === name) ||
    s.inputs?.some((i: any) => i.name === name) ||
    s.scalars?.some((sc: any) => sc.name === name)
  );
}

function getTypeAnchor(name: string): string {
  const s = schema as any;
  if (s.types?.some((t: any) => t.name === name)) return `type-${name}`;
  if (s.enums?.some((e: any) => e.name === name)) return `enum-${name}`;
  if (s.interfaces?.some((i: any) => i.name === name)) return `interface-${name}`;
  if (s.unions?.some((u: any) => u.name === name)) return `union-${name}`;
  if (s.inputs?.some((i: any) => i.name === name)) return `input-${name}`;
  if (s.scalars?.some((sc: any) => sc.name === name)) return `scalar-${name}`;
  return `type-${name}`;
}

export function typeRefToString(ref: TypeRef): string {
  if (ref.kind === "NON_NULL") return `${typeRefToString(ref.ofType!)}!`;
  if (ref.kind === "LIST") return `[${typeRefToString(ref.ofType!)}]`;
  return ref.name;
}

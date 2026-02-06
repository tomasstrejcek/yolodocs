export interface ParsedSchema {
    queries: FieldDefinition[];
    mutations: FieldDefinition[];
    subscriptions: FieldDefinition[];
    types: TypeDefinition[];
    enums: EnumDefinition[];
    interfaces: InterfaceDefinition[];
    unions: UnionDefinition[];
    inputs: InputDefinition[];
    scalars: ScalarDefinition[];
}
export interface FieldDefinition {
    name: string;
    description: string | null;
    type: TypeRef;
    args: ArgumentDefinition[];
    isDeprecated: boolean;
    deprecationReason: string | null;
}
export interface ArgumentDefinition {
    name: string;
    description: string | null;
    type: TypeRef;
    defaultValue: string | null;
    isDeprecated: boolean;
    deprecationReason: string | null;
}
export interface TypeRef {
    name: string;
    kind: "SCALAR" | "OBJECT" | "ENUM" | "INTERFACE" | "UNION" | "INPUT_OBJECT" | "LIST" | "NON_NULL";
    ofType: TypeRef | null;
}
export interface TypeDefinition {
    name: string;
    description: string | null;
    fields: FieldDefinition[];
    interfaces: string[];
}
export interface EnumDefinition {
    name: string;
    description: string | null;
    values: EnumValueDefinition[];
}
export interface EnumValueDefinition {
    name: string;
    description: string | null;
    isDeprecated: boolean;
    deprecationReason: string | null;
}
export interface InterfaceDefinition {
    name: string;
    description: string | null;
    fields: FieldDefinition[];
    implementations: string[];
}
export interface UnionDefinition {
    name: string;
    description: string | null;
    types: string[];
}
export interface InputDefinition {
    name: string;
    description: string | null;
    fields: InputFieldDefinition[];
}
export interface InputFieldDefinition {
    name: string;
    description: string | null;
    type: TypeRef;
    defaultValue: string | null;
}
export interface ScalarDefinition {
    name: string;
    description: string | null;
}
export interface NavigationManifest {
    sections: NavigationSection[];
}
export interface NavigationSection {
    id: string;
    title: string;
    items: NavigationItem[];
}
export interface NavigationItem {
    id: string;
    name: string;
    anchor: string;
    description: string;
}
export interface ExampleData {
    operations: Record<string, OperationExample>;
}
export interface OperationExample {
    query: string;
    variables: Record<string, unknown> | null;
    response: Record<string, unknown>;
}
export interface DocsManifest {
    pages: DocsPage[];
}
export interface DocsPage {
    slug: string;
    title: string;
    category: string;
    order: number;
    content: string;
}
//# sourceMappingURL=types.d.ts.map
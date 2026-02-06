const SCALAR_MOCKS = {
    String: "example-string",
    Int: 42,
    Float: 3.14,
    Boolean: true,
    ID: "abc123",
    UUID: "550e8400-e29b-41d4-a716-446655440000",
    DateTime: "2024-01-15T09:30:00Z",
    EmailAddress: "user@example.com",
    LocalDate: "2024-01-15",
    URL: "https://example.com",
    JSON: {},
};
export function generateExamples(schema, maxDepth = 2) {
    const ctx = new ExampleContext(schema, maxDepth);
    const operations = {};
    for (const query of schema.queries) {
        operations[query.name] = ctx.generateOperationExample(query, "query");
    }
    for (const mutation of schema.mutations) {
        operations[mutation.name] = ctx.generateOperationExample(mutation, "mutation");
    }
    return { operations };
}
class ExampleContext {
    typeMap;
    enumMap;
    inputMap;
    maxDepth;
    constructor(schema, maxDepth) {
        this.maxDepth = maxDepth;
        this.typeMap = new Map(schema.types.map((t) => [t.name, t]));
        this.enumMap = new Map(schema.enums.map((e) => [e.name, e]));
        this.inputMap = new Map(schema.inputs.map((i) => [i.name, i]));
    }
    generateOperationExample(field, operationType) {
        const args = this.generateArgs(field);
        const variables = this.generateVariables(field);
        const responseFields = this.generateResponseSelection(field.type, 0);
        const responseData = this.generateMockResponse(field.type, 0);
        // Build query string
        const varDefs = field.args.length > 0
            ? `(${field.args.map((a) => `$${a.name}: ${typeRefToString(a.type)}`).join(", ")})`
            : "";
        const argUsage = field.args.length > 0
            ? `(${field.args.map((a) => `${a.name}: $${a.name}`).join(", ")})`
            : "";
        const query = `${operationType} ${capitalize(field.name)}${varDefs} {\n  ${field.name}${argUsage}${responseFields}\n}`;
        return {
            query,
            variables: Object.keys(variables).length > 0 ? variables : null,
            response: {
                data: {
                    [field.name]: responseData,
                },
            },
        };
    }
    generateArgs(field) {
        return field.args
            .map((a) => `${a.name}: $${a.name}`)
            .join(", ");
    }
    generateVariables(field) {
        const vars = {};
        for (const arg of field.args) {
            vars[arg.name] = this.mockValueForType(arg.type);
        }
        return vars;
    }
    generateResponseSelection(typeRef, depth) {
        const namedType = unwrapType(typeRef);
        const typeDef = this.typeMap.get(namedType.name);
        if (!typeDef || depth >= this.maxDepth) {
            // Scalar or max depth reached - check if it's still an object type
            if (typeDef && depth >= this.maxDepth) {
                // Just pick scalar fields at max depth
                const scalarFields = typeDef.fields.filter((f) => isScalarLike(unwrapType(f.type).name, this.typeMap));
                if (scalarFields.length > 0) {
                    return (" {\n" +
                        scalarFields
                            .slice(0, 5)
                            .map((f) => "    ".repeat(depth + 1) + f.name)
                            .join("\n") +
                        "\n" +
                        "    ".repeat(depth) +
                        "  }");
                }
            }
            return "";
        }
        const lines = [];
        const indent = "  ".repeat(depth + 2);
        for (const f of typeDef.fields.slice(0, 8)) {
            const fieldNamedType = unwrapType(f.type);
            const subType = this.typeMap.get(fieldNamedType.name);
            if (!subType || depth + 1 >= this.maxDepth) {
                // Scalar field or at depth limit
                if (!subType || isScalarLike(fieldNamedType.name, this.typeMap)) {
                    lines.push(`${indent}${f.name}`);
                }
                else {
                    // Object at depth limit - pick scalar sub-fields
                    const scalarFields = subType.fields.filter((sf) => isScalarLike(unwrapType(sf.type).name, this.typeMap));
                    if (scalarFields.length > 0) {
                        lines.push(`${indent}${f.name} {`);
                        for (const sf of scalarFields.slice(0, 3)) {
                            lines.push(`${indent}  ${sf.name}`);
                        }
                        lines.push(`${indent}}`);
                    }
                }
            }
            else {
                const sub = this.generateResponseSelection(f.type, depth + 1);
                lines.push(`${indent}${f.name}${sub}`);
            }
        }
        if (lines.length === 0)
            return "";
        return " {\n" + lines.join("\n") + "\n" + "  ".repeat(depth + 1) + "}";
    }
    generateMockResponse(typeRef, depth) {
        const namedType = unwrapType(typeRef);
        if (isList(typeRef)) {
            return [this.generateMockResponse(stripList(typeRef), depth)];
        }
        const typeDef = this.typeMap.get(namedType.name);
        if (!typeDef) {
            return this.mockValueForType(typeRef);
        }
        if (depth >= this.maxDepth) {
            const obj = {};
            for (const f of typeDef.fields.slice(0, 5)) {
                if (isScalarLike(unwrapType(f.type).name, this.typeMap)) {
                    obj[f.name] = this.mockValueForType(f.type);
                }
            }
            return obj;
        }
        const obj = {};
        for (const f of typeDef.fields.slice(0, 8)) {
            obj[f.name] = this.generateMockResponse(f.type, depth + 1);
        }
        return obj;
    }
    mockValueForType(typeRef) {
        const named = unwrapType(typeRef);
        if (isList(typeRef)) {
            return [this.mockValueForType(stripList(typeRef))];
        }
        // Check enum
        const enumDef = this.enumMap.get(named.name);
        if (enumDef && enumDef.values.length > 0) {
            return enumDef.values[0].name;
        }
        // Check input
        const inputDef = this.inputMap.get(named.name);
        if (inputDef) {
            const obj = {};
            for (const f of inputDef.fields) {
                obj[f.name] = this.mockValueForType(f.type);
            }
            return obj;
        }
        // Check object type
        const typeDef = this.typeMap.get(named.name);
        if (typeDef) {
            const obj = {};
            for (const f of typeDef.fields.slice(0, 5)) {
                if (isScalarLike(unwrapType(f.type).name, this.typeMap)) {
                    obj[f.name] = this.mockValueForType(f.type);
                }
            }
            return obj;
        }
        // Scalar
        return SCALAR_MOCKS[named.name] ?? `example-${named.name.toLowerCase()}`;
    }
}
function unwrapType(ref) {
    if (ref.kind === "NON_NULL" || ref.kind === "LIST") {
        return unwrapType(ref.ofType);
    }
    return ref;
}
function isList(ref) {
    if (ref.kind === "LIST")
        return true;
    if (ref.kind === "NON_NULL" && ref.ofType)
        return isList(ref.ofType);
    return false;
}
function stripList(ref) {
    if (ref.kind === "LIST")
        return ref.ofType;
    if (ref.kind === "NON_NULL" && ref.ofType)
        return { ...ref, ofType: stripList(ref.ofType) };
    return ref;
}
function isScalarLike(typeName, typeMap) {
    if (SCALAR_MOCKS[typeName] !== undefined)
        return true;
    if ([
        "String",
        "Int",
        "Float",
        "Boolean",
        "ID",
    ].includes(typeName))
        return true;
    return !typeMap.has(typeName);
}
export function typeRefToString(ref) {
    if (ref.kind === "NON_NULL")
        return `${typeRefToString(ref.ofType)}!`;
    if (ref.kind === "LIST")
        return `[${typeRefToString(ref.ofType)}]`;
    return ref.name;
}
function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
//# sourceMappingURL=examples.js.map
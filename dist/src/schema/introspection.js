import { buildClientSchema, getIntrospectionQuery, printSchema, } from "graphql";
import fs from "node:fs";
export async function loadSchemaFromIntrospectionUrl(url, headers) {
    const query = getIntrospectionQuery();
    const resolvedHeaders = {};
    if (headers) {
        for (const [key, value] of Object.entries(headers)) {
            resolvedHeaders[key] = resolveEnvVars(value);
        }
    }
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...resolvedHeaders,
        },
        body: JSON.stringify({ query }),
    });
    if (!response.ok) {
        throw new Error(`Introspection request failed: ${response.status} ${response.statusText}`);
    }
    const result = (await response.json());
    const schema = buildClientSchema(result.data);
    return printSchema(schema);
}
export function loadSchemaFromIntrospectionFile(filePath) {
    const content = fs.readFileSync(filePath, "utf-8");
    const json = JSON.parse(content);
    const introspection = "data" in json ? json.data : json;
    const schema = buildClientSchema(introspection);
    return printSchema(schema);
}
function resolveEnvVars(value) {
    return value.replace(/\$\{(\w+)\}/g, (_, name) => {
        return process.env[name] || "";
    });
}
//# sourceMappingURL=introspection.js.map
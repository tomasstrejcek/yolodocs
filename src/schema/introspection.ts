import {
  buildClientSchema,
  getIntrospectionQuery,
  printSchema,
  type IntrospectionQuery,
} from "graphql";
import fs from "node:fs";

export async function loadSchemaFromIntrospectionUrl(
  url: string,
  headers?: Record<string, string>
): Promise<string> {
  const query = getIntrospectionQuery();

  const resolvedHeaders: Record<string, string> = {};
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
    throw new Error(
      `Introspection request failed: ${response.status} ${response.statusText}`
    );
  }

  const result = (await response.json()) as { data: IntrospectionQuery };
  const schema = buildClientSchema(result.data);
  return printSchema(schema);
}

export function loadSchemaFromIntrospectionFile(filePath: string): string {
  const content = fs.readFileSync(filePath, "utf-8");
  const json = JSON.parse(content) as
    | { data: IntrospectionQuery }
    | IntrospectionQuery;

  const introspection = "data" in json ? json.data : json;
  const schema = buildClientSchema(introspection);
  return printSchema(schema);
}

function resolveEnvVars(value: string): string {
  return value.replace(/\$\{(\w+)\}/g, (_, name) => {
    return process.env[name] || "";
  });
}

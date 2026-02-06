import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
const ConfigSchema = z.object({
    schema: z.string().optional(),
    introspectionUrl: z.string().url().optional(),
    introspectionFile: z.string().optional(),
    introspectionHeaders: z.record(z.string()).optional(),
    title: z.string().default("API Documentation"),
    description: z.string().default("GraphQL API Documentation"),
    version: z.string().optional(),
    logo: z.string().optional(),
    favicon: z.string().optional(),
    endpoint: z.string().url().optional(),
    playgroundHeaders: z.record(z.string()).optional(),
    docsDir: z.string().default("./docs"),
    output: z.string().default("./docs-site"),
    hideDeprecated: z.boolean().default(false),
    hideInternalTypes: z.boolean().default(true),
    showDescriptions: z.boolean().default(true),
    expandExampleDepth: z.number().default(2),
    groups: z
        .array(z.object({
        name: z.string(),
        operations: z.array(z.string()),
    }))
        .optional(),
    dev: z.boolean().default(false),
    serve: z.boolean().default(false),
});
export async function loadConfig(cliOptions) {
    let fileConfig = {};
    // Look for config file
    const configPath = cliOptions.config || findConfigFile(process.cwd());
    if (configPath && fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, "utf-8");
        if (configPath.endsWith(".json")) {
            fileConfig = JSON.parse(content);
        }
        else {
            fileConfig = yaml.load(content) || {};
        }
        console.log(`  Using config: ${configPath}`);
    }
    // CLI options override file config
    const merged = { ...fileConfig };
    if (cliOptions.schema)
        merged.schema = cliOptions.schema;
    if (cliOptions.introspectionUrl)
        merged.introspectionUrl = cliOptions.introspectionUrl;
    if (cliOptions.introspectionFile)
        merged.introspectionFile = cliOptions.introspectionFile;
    if (cliOptions.output)
        merged.output = cliOptions.output;
    if (cliOptions.title)
        merged.title = cliOptions.title;
    if (cliOptions.endpoint)
        merged.endpoint = cliOptions.endpoint;
    if (cliOptions.docsDir)
        merged.docsDir = cliOptions.docsDir;
    if (cliOptions.dev)
        merged.dev = true;
    if (cliOptions.serve)
        merged.serve = true;
    // Validate
    const result = ConfigSchema.safeParse(merged);
    if (!result.success) {
        const issues = result.error.issues
            .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
            .join("\n");
        throw new Error(`Invalid configuration:\n${issues}`);
    }
    const config = result.data;
    // Must have at least one schema source
    if (!config.schema && !config.introspectionUrl && !config.introspectionFile) {
        throw new Error("No schema source specified. Use --schema, --introspection-url, or --introspection-file");
    }
    return config;
}
function findConfigFile(dir) {
    const candidates = [
        "yolodocs.config.yml",
        "yolodocs.config.yaml",
        "yolodocs.config.json",
    ];
    for (const name of candidates) {
        const p = path.join(dir, name);
        if (fs.existsSync(p))
            return p;
    }
    return null;
}
//# sourceMappingURL=config.js.map
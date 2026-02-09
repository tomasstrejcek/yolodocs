import { Command } from "commander";
import { loadConfig, type YolodocsConfig } from "./config.js";
import { build } from "./build.js";

export function createCli() {
  const program = new Command();

  program
    .name("yolodocs")
    .description(
      "Generate beautiful, searchable, static documentation from GraphQL schemas"
    )
    .version("0.1.0");

  program
    .option("-s, --schema <path>", "Path to GraphQL SDL schema file")
    .option(
      "--introspection-url <url>",
      "URL to introspect for schema"
    )
    .option(
      "--introspection-file <path>",
      "Path to introspection JSON file"
    )
    .option("-o, --output <path>", "Output directory", "./docs-site")
    .option("-c, --config <path>", "Path to config file")
    .option("--title <title>", "Site title")
    .option("--endpoint <url>", "GraphQL endpoint for playground")
    .option("--dev", "Run in development mode with hot reload")
    .option("--serve", "Serve built output for preview")
    .option("--docs-dir <path>", "Path to custom docs folder")
    .option("--base <path>", "Base path prefix for serving under a subpath (e.g. /docs)")
    .action(async (options) => {
      try {
        const config = await loadConfig(options);
        await build(config);
      } catch (error) {
        if (error instanceof Error) {
          console.error(`\n  Error: ${error.message}\n`);
        } else {
          console.error(error);
        }
        process.exit(1);
      }
    });

  return program;
}

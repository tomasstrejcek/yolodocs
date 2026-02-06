import fs from "node:fs";
import fse from "fs-extra";
import path from "node:path";
import { execSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseSchemaFromFile, parseSchemaFromSDL } from "../schema/parser.js";
import { generateExamples } from "../schema/examples.js";
import { loadSchemaFromIntrospectionUrl, loadSchemaFromIntrospectionFile, } from "../schema/introspection.js";
import { scanDocsFolder } from "../markdown/loader.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
function getSiteTemplatePath() {
    // Navigate from dist/src/cli/ up to project root, then into src/site/
    return path.resolve(__dirname, "../../../src/site");
}
export async function build(config) {
    console.log("\n  yolodocs - GraphQL Documentation Generator\n");
    if (config.serve) {
        return serveOutput(config);
    }
    // Step 1: Parse schema
    console.log("  [1/5] Parsing schema...");
    const schema = await loadSchema(config);
    console.log(`        ${schema.queries.length} queries, ${schema.mutations.length} mutations, ${schema.types.length} types`);
    // Step 2: Generate examples
    console.log("  [2/5] Generating examples...");
    const examples = generateExamples(schema, config.expandExampleDepth);
    console.log(`        ${Object.keys(examples.operations).length} operation examples`);
    // Step 3: Scan custom docs
    console.log("  [3/5] Scanning custom docs...");
    const docsDir = path.resolve(process.cwd(), config.docsDir);
    const docsManifest = scanDocsFolder(docsDir);
    console.log(`        ${docsManifest.pages.length} custom pages`);
    // Step 4: Build navigation manifest
    const manifest = buildNavigationManifest(schema, docsManifest);
    // Step 5: Build static site
    console.log("  [4/5] Building static site...");
    const siteTemplateDir = getSiteTemplatePath();
    const outputDir = path.resolve(process.cwd(), config.output);
    const buildDir = path.join(outputDir, ".build-tmp");
    // Copy site template to build dir
    fse.ensureDirSync(buildDir);
    fse.copySync(siteTemplateDir, buildDir, {
        filter: (src) => !src.includes("node_modules") && !src.includes(".vinxi"),
    });
    // Inject data files
    const dataDir = path.join(buildDir, "src", "data");
    fse.ensureDirSync(dataDir);
    fs.writeFileSync(path.join(dataDir, "schema.json"), JSON.stringify(schema, null, 2));
    fs.writeFileSync(path.join(dataDir, "manifest.json"), JSON.stringify(manifest, null, 2));
    fs.writeFileSync(path.join(dataDir, "examples.json"), JSON.stringify(examples, null, 2));
    fs.writeFileSync(path.join(dataDir, "docs-manifest.json"), JSON.stringify(docsManifest, null, 2));
    // Write site config for the SolidStart app
    const siteConfig = {
        title: config.title,
        description: config.description,
        version: config.version,
        endpoint: config.endpoint,
        playgroundHeaders: config.playgroundHeaders,
        hideDeprecated: config.hideDeprecated,
        showDescriptions: config.showDescriptions,
    };
    fs.writeFileSync(path.join(dataDir, "site-config.json"), JSON.stringify(siteConfig, null, 2));
    // Copy user assets
    if (config.logo) {
        const logoSrc = path.resolve(process.cwd(), config.logo);
        if (fs.existsSync(logoSrc)) {
            fse.copySync(logoSrc, path.join(buildDir, "public", "logo" + path.extname(logoSrc)));
        }
    }
    if (config.favicon) {
        const faviconSrc = path.resolve(process.cwd(), config.favicon);
        if (fs.existsSync(faviconSrc)) {
            fse.copySync(faviconSrc, path.join(buildDir, "public", "favicon" + path.extname(faviconSrc)));
        }
    }
    if (config.dev) {
        return runDevServer(buildDir);
    }
    // Install dependencies and build
    console.log("        Installing dependencies...");
    execSync("npm install", { cwd: buildDir, stdio: "pipe" });
    console.log("        Running SolidStart build...");
    execSync("npm run build", { cwd: buildDir, stdio: "pipe" });
    // Copy built output
    const builtOutput = path.join(buildDir, ".output", "public");
    if (fs.existsSync(builtOutput)) {
        fse.copySync(builtOutput, outputDir, { overwrite: true });
        console.log("        Copied output from: .output/public");
    }
    else {
        throw new Error("Build failed: .output/public not found. Run with YOLODOCS_DEBUG=1 to inspect the build directory.");
    }
    // Step 6: Post-build - Pagefind indexing
    console.log("  [5/5] Indexing for search...");
    try {
        execSync(`npm exec -- pagefind --site "${outputDir}" --output-subdir _pagefind`, { cwd: buildDir, stdio: "pipe" });
        console.log("        Search index generated");
    }
    catch {
        console.log("        Skipping search indexing (pagefind not available)");
    }
    // Clean up build dir (keep in debug mode for inspection)
    if (!process.env.YOLODOCS_DEBUG) {
        fse.removeSync(buildDir);
    }
    else {
        console.log(`        Debug: build dir kept at ${buildDir}`);
    }
    console.log(`\n  Done! Output: ${outputDir}\n`);
    console.log(`  Preview with: npx yolodocs --schema ${config.schema} --output ${config.output} --serve\n`);
}
async function loadSchema(config) {
    let sdl;
    if (config.schema) {
        const schemaPath = path.resolve(process.cwd(), config.schema);
        if (!fs.existsSync(schemaPath)) {
            throw new Error(`Schema file not found: ${schemaPath}`);
        }
        return parseSchemaFromFile(schemaPath, config.hideInternalTypes);
    }
    else if (config.introspectionUrl) {
        sdl = await loadSchemaFromIntrospectionUrl(config.introspectionUrl, config.introspectionHeaders);
        return parseSchemaFromSDL(sdl, config.hideInternalTypes);
    }
    else if (config.introspectionFile) {
        const filePath = path.resolve(process.cwd(), config.introspectionFile);
        sdl = loadSchemaFromIntrospectionFile(filePath);
        return parseSchemaFromSDL(sdl, config.hideInternalTypes);
    }
    throw new Error("No schema source configured");
}
function buildNavigationManifest(schema, docsManifest) {
    const sections = [];
    // Add custom docs first (guides at the top of sidebar)
    if (docsManifest.pages.length > 0) {
        const categories = new Map();
        for (const page of docsManifest.pages) {
            const cat = categories.get(page.category) || [];
            cat.push(page);
            categories.set(page.category, cat);
        }
        for (const [category, pages] of categories) {
            sections.push({
                id: `docs-${category.toLowerCase().replace(/\s+/g, "-")}`,
                title: category,
                items: pages.map((p) => ({
                    id: `doc-${p.slug}`,
                    name: p.title,
                    anchor: `/docs/${p.slug}`,
                    description: "",
                })),
            });
        }
    }
    if (schema.queries.length > 0) {
        sections.push({
            id: "queries",
            title: "Queries",
            items: schema.queries.map((q) => ({
                id: `query-${q.name}`,
                name: q.name,
                anchor: `#query-${q.name}`,
                description: q.description || "",
            })),
        });
    }
    if (schema.mutations.length > 0) {
        sections.push({
            id: "mutations",
            title: "Mutations",
            items: schema.mutations.map((m) => ({
                id: `mutation-${m.name}`,
                name: m.name,
                anchor: `#mutation-${m.name}`,
                description: m.description || "",
            })),
        });
    }
    if (schema.subscriptions.length > 0) {
        sections.push({
            id: "subscriptions",
            title: "Subscriptions",
            items: schema.subscriptions.map((s) => ({
                id: `subscription-${s.name}`,
                name: s.name,
                anchor: `#subscription-${s.name}`,
                description: s.description || "",
            })),
        });
    }
    if (schema.types.length > 0) {
        sections.push({
            id: "types",
            title: "Types",
            items: schema.types.map((t) => ({
                id: `type-${t.name}`,
                name: t.name,
                anchor: `#type-${t.name}`,
                description: t.description || "",
            })),
        });
    }
    if (schema.enums.length > 0) {
        sections.push({
            id: "enums",
            title: "Enums",
            items: schema.enums.map((e) => ({
                id: `enum-${e.name}`,
                name: e.name,
                anchor: `#enum-${e.name}`,
                description: e.description || "",
            })),
        });
    }
    if (schema.interfaces.length > 0) {
        sections.push({
            id: "interfaces",
            title: "Interfaces",
            items: schema.interfaces.map((i) => ({
                id: `interface-${i.name}`,
                name: i.name,
                anchor: `#interface-${i.name}`,
                description: i.description || "",
            })),
        });
    }
    if (schema.unions.length > 0) {
        sections.push({
            id: "unions",
            title: "Unions",
            items: schema.unions.map((u) => ({
                id: `union-${u.name}`,
                name: u.name,
                anchor: `#union-${u.name}`,
                description: u.description || "",
            })),
        });
    }
    if (schema.inputs.length > 0) {
        sections.push({
            id: "inputs",
            title: "Inputs",
            items: schema.inputs.map((i) => ({
                id: `input-${i.name}`,
                name: i.name,
                anchor: `#input-${i.name}`,
                description: i.description || "",
            })),
        });
    }
    if (schema.scalars.length > 0) {
        sections.push({
            id: "scalars",
            title: "Scalars",
            items: schema.scalars.map((s) => ({
                id: `scalar-${s.name}`,
                name: s.name,
                anchor: `#scalar-${s.name}`,
                description: s.description || "",
            })),
        });
    }
    return { sections };
}
async function runDevServer(buildDir) {
    console.log("        Installing dependencies...");
    execSync("npm install", { cwd: buildDir, stdio: "pipe" });
    console.log("\n  Starting dev server...\n");
    const child = spawn("npm", ["run", "dev"], {
        cwd: buildDir,
        stdio: "inherit",
        shell: true,
    });
    return new Promise((resolve) => {
        child.on("close", () => resolve());
    });
}
function serveOutput(config) {
    const outputDir = path.resolve(process.cwd(), config.output);
    if (!fs.existsSync(outputDir)) {
        throw new Error(`Output directory not found: ${outputDir}. Run a build first.`);
    }
    console.log(`  Serving: ${outputDir}\n`);
    const child = spawn("npx", ["serve", outputDir], {
        stdio: "inherit",
        shell: true,
    });
    return new Promise((resolve) => {
        child.on("close", () => resolve());
    });
}
//# sourceMappingURL=build.js.map
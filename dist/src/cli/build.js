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
function getVersion() {
    const pkgPath = path.resolve(__dirname, "../../../package.json");
    try {
        return JSON.parse(fs.readFileSync(pkgPath, "utf-8")).version;
    }
    catch {
        return "unknown";
    }
}
function getSiteTemplatePath() {
    // Navigate from dist/src/cli/ up to project root, then into src/site/
    return path.resolve(__dirname, "../../../src/site");
}
export async function build(config) {
    console.log(`\n  yolodocs v${getVersion()} - GraphQL Documentation Generator\n`);
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
    const manifest = buildNavigationManifest(schema, docsManifest, config.base);
    // Step 5: Build static site
    console.log("  [4/5] Building static site...");
    const siteTemplateDir = getSiteTemplatePath();
    const outputDir = path.resolve(process.cwd(), config.output);
    const buildDir = path.join(outputDir, ".build-tmp");
    // Copy site template to build dir
    fse.ensureDirSync(buildDir);
    fse.copySync(siteTemplateDir, buildDir, {
        filter: (src) => {
            const rel = path.relative(siteTemplateDir, src);
            return !rel.includes("node_modules") && !rel.includes(".vinxi");
        },
    });
    // Inject data files
    const dataDir = path.join(buildDir, "src", "data");
    fse.ensureDirSync(dataDir);
    fs.writeFileSync(path.join(dataDir, "schema.json"), JSON.stringify(schema, null, 2));
    fs.writeFileSync(path.join(dataDir, "manifest.json"), JSON.stringify(manifest, null, 2));
    fs.writeFileSync(path.join(dataDir, "examples.json"), JSON.stringify(examples, null, 2));
    // Write docs-manifest.json without content (metadata only) to keep bundle small
    const docsManifestMeta = {
        pages: docsManifest.pages.map(({ content, ...meta }) => meta),
    };
    fs.writeFileSync(path.join(dataDir, "docs-manifest.json"), JSON.stringify(docsManifestMeta, null, 2));
    // Write individual doc page content as separate JS modules to avoid
    // bundling all markdown into one large JSON module (breaks Nitro prerender)
    const docsPagesDir = path.join(dataDir, "docs-pages");
    fse.ensureDirSync(docsPagesDir);
    for (const page of docsManifest.pages) {
        const pageFile = path.join(docsPagesDir, `${page.slug}.js`);
        fse.ensureDirSync(path.dirname(pageFile));
        fs.writeFileSync(pageFile, `export default ${JSON.stringify(page.content)};`);
    }
    // Write site config for the SolidStart app
    const siteConfig = {
        title: config.title,
        description: config.description,
        version: config.version,
        endpoint: config.endpoint,
        playgroundHeaders: config.playgroundHeaders,
        hideDeprecated: config.hideDeprecated,
        showDescriptions: config.showDescriptions,
        base: config.base,
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
    let buildOutput;
    try {
        buildOutput = execSync("npm run build 2>&1", { cwd: buildDir, encoding: "utf-8" });
    }
    catch (err) {
        console.error("\n        SolidStart build failed:");
        console.error(err.stdout || err.stderr || err.message);
        throw new Error("SolidStart build failed");
    }
    // Log prerender summary from build output
    const prerenderSummary = buildOutput.match(/Prerendered \d+ routes? in .+/);
    if (prerenderSummary) {
        console.log(`        ${prerenderSummary[0]}`);
    }
    // Copy built output
    const builtOutput = path.join(buildDir, ".output", "public");
    if (fs.existsSync(builtOutput)) {
        fse.copySync(builtOutput, outputDir, { overwrite: true });
        console.log("        Copied output from: .output/public");
    }
    else {
        console.error("\n        Build produced no .output/public directory.");
        console.error("        Build output:\n");
        console.error(buildOutput);
        throw new Error("Build failed: .output/public not found. Run with YOLODOCS_DEBUG=1 to inspect the build directory.");
    }
    // Validate HTML was actually generated
    const indexHtml = path.join(outputDir, "index.html");
    if (!fs.existsSync(indexHtml)) {
        console.error("\n        Build succeeded but no HTML files were generated.");
        console.error("        The SolidStart prerender step likely failed silently.");
        console.error("        Full build output:\n");
        console.error(buildOutput);
        throw new Error("Build failed: prerender produced no HTML files. " +
            "This often happens in Docker/CI environments due to Node version incompatibilities. " +
            "Run with YOLODOCS_DEBUG=1 to keep the build directory for inspection.");
    }
    // Write raw markdown files so /<slug>.md serves the source
    for (const page of docsManifest.pages) {
        const mdFile = path.join(outputDir, `${page.slug}.md`);
        fse.ensureDirSync(path.dirname(mdFile));
        fs.writeFileSync(mdFile, page.content);
    }
    // Write docs.json manifest for machine-readable discovery
    const basePath = config.base || "";
    const docsJson = {
        pages: docsManifest.pages.map((p) => ({
            slug: p.slug,
            title: p.title,
            markdown: `${basePath}/${p.slug}.md`,
        })),
    };
    fs.writeFileSync(path.join(outputDir, "docs.json"), JSON.stringify(docsJson, null, 2));
    // Inject <link rel="alternate"> tags into pre-rendered HTML
    const docsJsonLink = `<link rel="alternate" type="application/json" href="${basePath}/docs.json" title="Documentation Index">`;
    const htmlFiles = findHtmlFiles(outputDir);
    const docSlugs = new Set(docsManifest.pages.map((p) => p.slug));
    for (const htmlFile of htmlFiles) {
        let html = fs.readFileSync(htmlFile, "utf-8");
        // Per-page markdown link for doc pages
        const rel = path.relative(outputDir, htmlFile);
        const slug = rel.replace(/\.html$/, "").replace(/\/index$/, "");
        if (docSlugs.has(slug)) {
            const mdLink = `<link rel="alternate" type="text/markdown" href="${basePath}/${slug}.md">`;
            html = html.replace("</head>", `${mdLink}\n</head>`);
        }
        // Site-wide docs.json link for all pages
        html = html.replace("</head>", `${docsJsonLink}\n</head>`);
        fs.writeFileSync(htmlFile, html);
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
export function toTitleCase(s) {
    return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
const sortPages = (a, b) => {
    if (a.order !== b.order)
        return a.order - b.order;
    return a.title.localeCompare(b.title);
};
export function buildNavigationManifest(schema, docsManifest, _base) {
    const sections = [];
    // Add custom docs first (guides at the top of sidebar)
    if (docsManifest.pages.length > 0) {
        const rootPages = [];
        // sectionKey -> { ungrouped: pages, groups: groupKey -> pages }
        const sectionMap = new Map();
        for (const page of docsManifest.pages) {
            const parts = page.slug.split("/");
            if (parts.length === 1) {
                // Root page (no folder)
                rootPages.push(page);
            }
            else if (parts.length === 2) {
                // 2-segment: section=parts[0], ungrouped leaf
                const sectionKey = parts[0];
                const entry = sectionMap.get(sectionKey) ?? { ungrouped: [], groups: new Map() };
                entry.ungrouped.push(page);
                sectionMap.set(sectionKey, entry);
            }
            else {
                // 3+ segments: section=parts[0], group=parts[1], leaf=rest
                const sectionKey = parts[0];
                const groupKey = parts[1];
                const entry = sectionMap.get(sectionKey) ?? { ungrouped: [], groups: new Map() };
                const groupPages = entry.groups.get(groupKey) ?? [];
                groupPages.push(page);
                entry.groups.set(groupKey, groupPages);
                sectionMap.set(sectionKey, entry);
            }
        }
        // Emit root "Documentation" section
        if (rootPages.length > 0) {
            rootPages.sort(sortPages);
            sections.push({
                id: "docs",
                title: "Documentation",
                items: rootPages.map((p) => ({
                    id: `doc-${p.slug}`,
                    name: p.title,
                    anchor: `/${p.slug}.html`,
                    description: "",
                })),
            });
        }
        // Emit folder sections alphabetically by section key
        const sortedSectionKeys = [...sectionMap.keys()].sort();
        for (const sectionKey of sortedSectionKeys) {
            const { ungrouped, groups } = sectionMap.get(sectionKey);
            ungrouped.sort(sortPages);
            const items = [];
            // Ungrouped pages first (sorted by order/title)
            for (const p of ungrouped) {
                items.push({
                    id: `doc-${p.slug}`,
                    name: p.title,
                    anchor: `/${p.slug}.html`,
                    description: "",
                });
            }
            // Groups alphabetically by group key
            const sortedGroupKeys = [...groups.keys()].sort();
            for (const groupKey of sortedGroupKeys) {
                const groupPages = groups.get(groupKey);
                groupPages.sort(sortPages);
                items.push({
                    id: `docs-folder-${sectionKey}-${groupKey}`,
                    name: toTitleCase(groupKey),
                    anchor: "",
                    description: "",
                    children: groupPages.map((p) => ({
                        id: `doc-${p.slug}`,
                        name: p.title,
                        anchor: `/${p.slug}.html`,
                        description: "",
                    })),
                });
            }
            sections.push({
                id: `docs-${sectionKey}`,
                title: toTitleCase(sectionKey),
                items,
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
function findHtmlFiles(dir) {
    const results = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...findHtmlFiles(full));
        }
        else if (entry.name.endsWith(".html")) {
            results.push(full);
        }
    }
    return results;
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
import { defineConfig } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const siteConfig = JSON.parse(
  readFileSync(resolve(__dirname, "src/data/site-config.json"), "utf-8")
);
const base = siteConfig.base || "";

// Read docs manifest to generate explicit prerender routes
const docsManifest = JSON.parse(
  readFileSync(resolve(__dirname, "src/data/docs-manifest.json"), "utf-8")
);

const prerenderRoutes = ["/", "/reference"];
for (const page of (docsManifest as any).pages || []) {
  prerenderRoutes.push(`/${page.slug}`);
}

export default defineConfig({
  server: {
    baseURL: base || undefined,
    preset: "static",
    prerender: {
      routes: prerenderRoutes,
      crawlLinks: true,
      failOnError: true,
      autoSubfolderIndex: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});

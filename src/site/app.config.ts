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

export default defineConfig({
  server: {
    baseURL: base || undefined,
    preset: "static",
    prerender: {
      routes: ["/", "/reference"],
      crawlLinks: true,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});

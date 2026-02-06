import { defineConfig } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  server: {
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

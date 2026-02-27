import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  use: {
    headless: true,
  },
  // Single worker — tests share a server started in beforeAll
  workers: 1,
});

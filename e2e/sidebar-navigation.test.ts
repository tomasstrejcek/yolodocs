import { test, expect } from "@playwright/test";
import { execSync, spawn, type ChildProcess } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "test-output");
const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;

let server: ChildProcess;

test.beforeAll(async () => {
  // Build the docs site using the test schema
  if (existsSync(OUTPUT)) rmSync(OUTPUT, { recursive: true });
  execSync(
    `node dist/bin/yolodocs.js --schema schema.graphql --output test-output --title "E2E Test" --docs-dir ./docs`,
    { cwd: ROOT, stdio: "pipe", timeout: 120_000 }
  );

  // Start a static file server with clean URLs disabled to match real deployment
  server = spawn("npx", ["serve", OUTPUT, "-l", String(PORT), "--no-clipboard"], {
    cwd: ROOT,
    stdio: "pipe",
    shell: true,
  });

  // Wait for server to be ready
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Server start timeout")), 15_000);
    const check = async () => {
      try {
        const res = await fetch(BASE_URL);
        if (res.ok) {
          clearTimeout(timeout);
          resolve();
          return;
        }
      } catch {}
      setTimeout(check, 300);
    };
    check();
  });
});

test.afterAll(() => {
  if (server) {
    server.kill("SIGTERM");
  }
});

test("clicking a sidebar doc link from home navigates and shows content", async ({ page }) => {
  await page.goto(BASE_URL);
  await page.waitForLoadState("networkidle");

  // Click "Getting Started" in the desktop sidebar
  const gsLink = page.locator("aside nav a", { hasText: "Getting Started" }).first();
  await expect(gsLink).toBeVisible();
  await gsLink.click();

  // Wait for URL to change and content to appear
  await page.waitForURL(/getting-started/, { timeout: 5000 });
  await expect(page.locator("main h1").first()).toContainText("Getting Started", { timeout: 5000 });
});

test("navigating between doc pages updates both URL and content", async ({ page }) => {
  // Navigate to first doc page via sidebar (ensures client-side routing is active)
  await page.goto(BASE_URL);
  await page.waitForLoadState("networkidle");

  const gsLink = page.locator("aside nav a", { hasText: "Getting Started" }).first();
  await gsLink.click();
  await page.waitForURL(/getting-started/, { timeout: 5000 });
  await expect(page.locator("main h1").first()).toContainText("Getting Started", { timeout: 5000 });

  // Now navigate to a DIFFERENT doc page — this is the critical test.
  // Both pages match the same [...path] catch-all route.
  const authLink = page.locator("aside nav a", { hasText: "Authentication" }).first();
  await expect(authLink).toBeVisible();
  await authLink.click();

  // URL must change
  await page.waitForURL(/authentication/, { timeout: 5000 });

  // Content must update — the h1 must now say "Authentication"
  await expect(page.locator("main h1").first()).toContainText("Authentication", { timeout: 5000 });
});

test("navigating from doc page to home updates content", async ({ page }) => {
  // Navigate to a doc page first
  await page.goto(BASE_URL);
  await page.waitForLoadState("networkidle");

  const gsLink = page.locator("aside nav a", { hasText: "Getting Started" }).first();
  await gsLink.click();
  await page.waitForURL(/getting-started/, { timeout: 5000 });

  // Click the logo/title link to go home
  const logoLink = page.locator("header a").first();
  await logoLink.click();
  await page.waitForURL(new RegExp(`^${BASE_URL}/?$`), { timeout: 5000 });

  // Home page should not show the Getting Started h1
  await expect(page.locator("main h1").first()).not.toContainText("Getting Started");
});

test("navigating from doc page to reference page works", async ({ page }) => {
  await page.goto(BASE_URL);
  await page.waitForLoadState("networkidle");

  // Navigate to a doc page first
  const gsLink = page.locator("aside nav a", { hasText: "Getting Started" }).first();
  await gsLink.click();
  await page.waitForURL(/getting-started/, { timeout: 5000 });

  // Click the Reference link in the header
  const refLink = page.locator("header a", { hasText: "Reference" }).first();
  await expect(refLink).toBeVisible();
  await refLink.click();
  await page.waitForURL(/\/reference/, { timeout: 5000 });

  // Reference page should show schema content
  await expect(page.locator("main")).toContainText("Queries", { timeout: 5000 });
});

test("sequential doc page navigation keeps URL and content in sync", async ({ page }) => {
  await page.goto(BASE_URL);
  await page.waitForLoadState("networkidle");

  // Step 1: Home -> Getting Started
  const gsLink = page.locator("aside nav a", { hasText: "Getting Started" }).first();
  await gsLink.click();
  await page.waitForURL(/getting-started/, { timeout: 5000 });
  await expect(page.locator("main h1").first()).toContainText("Getting Started", { timeout: 5000 });

  // Step 2: Getting Started -> Authentication (different sidebar section)
  const authLink = page.locator("aside nav a", { hasText: "Authentication" }).first();
  await authLink.click();
  await page.waitForURL(/authentication/, { timeout: 5000 });
  await expect(page.locator("main h1").first()).toContainText("Authentication", { timeout: 5000 });

  // Step 3: Authentication -> Pagination (same sidebar section)
  const pagLink = page.locator("aside nav a", { hasText: "Pagination" }).first();
  await pagLink.click();
  await page.waitForURL(/pagination/, { timeout: 5000 });
  await expect(page.locator("main h1").first()).toContainText("Pagination", { timeout: 5000 });

  // Step 4: Pagination -> Error Handling
  const errLink = page.locator("aside nav a", { hasText: "Error Handling" }).first();
  await errLink.click();
  await page.waitForURL(/error-handling/, { timeout: 5000 });
  await expect(page.locator("main h1").first()).toContainText("Error Handling", { timeout: 5000 });
});

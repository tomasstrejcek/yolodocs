import { test, expect, type Page } from "@playwright/test";
import { execSync, spawn, type ChildProcess } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "test-output-search");
const PORT = 4174;
const BASE_URL = `http://localhost:${PORT}`;

let server: ChildProcess;

test.beforeAll(async () => {
  if (existsSync(OUTPUT)) rmSync(OUTPUT, { recursive: true });
  execSync(
    `node dist/bin/yolodocs.js --schema schema.graphql --output test-output-search --title "E2E Search" --docs-dir ./docs`,
    { cwd: ROOT, stdio: "pipe", timeout: 180_000 },
  );

  server = spawn("npx", ["serve", OUTPUT, "-l", String(PORT), "--no-clipboard"], {
    cwd: ROOT,
    stdio: "pipe",
    shell: true,
  });

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
  if (server) server.kill("SIGTERM");
});

async function searchFor(page: Page, query: string) {
  await page.goto(BASE_URL);
  await page.waitForLoadState("networkidle");
  await page.locator("header button", { hasText: "Search" }).click();
  await page.locator('input[placeholder*="Search"]').fill(query);
  const results = page.getByTestId("docs-result");
  await expect(results.first()).toBeVisible({ timeout: 15_000 });
  return results;
}

test("a docs search result opens a real page", async ({ page }) => {
  const results = await searchFor(page, "orderBy");
  await results.first().click();

  await expect(page.locator("main h1").first()).toBeVisible({ timeout: 5000 });
  await expect(page.locator("main")).not.toContainText("Page Not Found");
  // The scratch build dir used to be indexed alongside the real output, so
  // results pointed at /.build-tmp/.output/public/<slug> and 404'd.
  expect(page.url()).not.toContain("build-tmp");
});

test("results deep-link to the heading that matched", async ({ page }) => {
  const results = await searchFor(page, "tie-breaking");
  await expect(results.first()).toContainText("Multiple Sort Fields");
  await results.first().click();

  await page.waitForURL(/#multiple-sort-fields/, { timeout: 5000 });
  await expect(page.locator("#multiple-sort-fields")).toBeVisible();
});

test("site chrome is not searchable, so a nav word matches no page", async ({ page }) => {
  await page.goto(BASE_URL);
  await page.waitForLoadState("networkidle");
  await page.locator("header button", { hasText: "Search" }).click();
  // "Generated with yolodocs" is page furniture that used to sit in every
  // page's index entry, making every page a hit for it.
  await page.locator('input[placeholder*="Search"]').fill("yolodocs");

  await expect(page.getByTestId("docs-result")).toHaveCount(0, { timeout: 10_000 });
});

test("a schema search result scrolls to its operation on the reference page", async ({ page }) => {
  await page.goto(BASE_URL);
  await page.waitForLoadState("networkidle");
  await page.locator("header button", { hasText: "Search" }).click();
  await page.locator('input[placeholder*="Search"]').fill("getBrandDetail");

  const result = page.getByTestId("schema-result").first();
  await expect(result).toBeVisible({ timeout: 10_000 });
  await result.click();

  // The anchor id lives on the heading (Pagefind splits sub-results there), so
  // this also guards the reference page's own anchor navigation.
  await page.waitForURL(/\/reference#query-getBrandDetail/, { timeout: 5000 });
  await expect(page.locator("h3#query-getBrandDetail")).toBeInViewport();
});

test("a hard refresh on a search result URL still serves the page", async ({ page }) => {
  const results = await searchFor(page, "orderBy");
  await results.first().click();
  await expect(page.locator("main h1").first()).toBeVisible({ timeout: 5000 });

  const url = page.url();
  const res = await page.goto(url);
  expect(res?.status()).toBe(200);
  await expect(page.locator("main h1").first()).toBeVisible({ timeout: 5000 });
});

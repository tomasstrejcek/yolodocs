import { describe, it, expect } from "vitest";
import { transformUrl, toRouterPath } from "./urls";

describe("transformUrl (route matching)", () => {
  it("strips .html from doc page paths", () => {
    expect(transformUrl("/developer/authentication.html")).toBe("/developer/authentication");
    expect(transformUrl("/getting-started.html")).toBe("/getting-started");
  });

  it("leaves clean paths unchanged", () => {
    expect(transformUrl("/developer/authentication")).toBe("/developer/authentication");
    expect(transformUrl("/")).toBe("/");
    expect(transformUrl("/reference")).toBe("/reference");
  });

  it("maps /index.html to / so the root route matches correctly", () => {
    expect(transformUrl("/index.html")).toBe("/");
    expect(transformUrl("/base/index.html")).toBe("/base/");
  });

  it("strips .html when a hash or query follows, so anchored links still match", () => {
    expect(transformUrl("/developer/testing.html#fixture-ids")).toBe(
      "/developer/testing#fixture-ids",
    );
    expect(transformUrl("/developer/testing.html?x=1")).toBe("/developer/testing?x=1");
    expect(transformUrl("/index.html#top")).toBe("/#top");
  });

  it("does not modify reference hash paths", () => {
    expect(transformUrl("/reference#queries")).toBe("/reference#queries");
  });
});

describe("toRouterPath (pagefind result url -> navigate() argument)", () => {
  const slugs = new Set([
    "getting-started",
    "developer/authentication",
    "integrations/pubsub/ready",
  ]);

  it("keeps .html so a result URL survives a hard refresh", () => {
    expect(toRouterPath("/getting-started.html", "", slugs)).toBe("/getting-started.html");
    expect(toRouterPath("/developer/authentication.html", "", slugs)).toBe(
      "/developer/authentication.html",
    );
  });

  it("strips the base prefix", () => {
    expect(toRouterPath("/docs/getting-started.html", "/docs", slugs)).toBe(
      "/getting-started.html",
    );
  });

  it("keeps a sub-result anchor", () => {
    expect(toRouterPath("/docs/getting-started.html#install", "/docs", slugs)).toBe(
      "/getting-started.html#install",
    );
    expect(toRouterPath("/reference.html#query-getBrand", "", slugs)).toBe(
      "/reference#query-getBrand",
    );
  });

  it("maps the root and the reference page to their routes", () => {
    expect(toRouterPath("/", "", slugs)).toBe("/");
    expect(toRouterPath("/index.html", "", slugs)).toBe("/");
    expect(toRouterPath("/reference.html", "", slugs)).toBe("/reference");
  });

  it("collapses slug/index.html to the same path as slug.html", () => {
    expect(toRouterPath("/getting-started/index.html", "", slugs)).toBe(
      toRouterPath("/getting-started.html", "", slugs),
    );
  });

  it("rejects indexed HTML that is not a page of the site", () => {
    // Regression: the build scratch dir used to live under the output root, so
    // every page was indexed a second time under a path that 404s.
    expect(
      toRouterPath("/.build-tmp/.output/public/integrations/pubsub/ready.html", "", slugs),
    ).toBe(null);
    expect(toRouterPath("/.build-tmp/node_modules/@mapbox/x/index.html", "", slugs)).toBe(null);
    expect(toRouterPath("/docs.json.html", "", slugs)).toBe(null);
    expect(toRouterPath("/some/deleted/page.html", "", slugs)).toBe(null);
  });
});

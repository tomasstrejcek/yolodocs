import { describe, it, expect } from "vitest";
import { slugifyHeading, createHeadingSlugger } from "./heading-slug";

describe("slugifyHeading", () => {
  it("lowercases and hyphenates words", () => {
    expect(slugifyHeading("Adding a new push notification")).toBe("adding-a-new-push-notification");
  });

  it("drops punctuation the way GitHub anchors do", () => {
    expect(slugifyHeading("`update()` vs. `save()`")).toBe("update-vs-save");
    expect(slugifyHeading("Two tier fields: brandTier vs paymentTier")).toBe(
      "two-tier-fields-brandtier-vs-paymenttier",
    );
    expect(slugifyHeading("What's next?")).toBe("whats-next");
  });

  it("keeps underscores and non-ASCII letters", () => {
    expect(slugifyHeading("collaboration_ready payload")).toBe("collaboration_ready-payload");
    expect(slugifyHeading("Značka a sběr")).toBe("značka-a-sběr");
  });

  it("strips inline markup and html", () => {
    expect(slugifyHeading("**Bold** and <code>code</code>")).toBe("bold-and-code");
  });
});

describe("createHeadingSlugger", () => {
  it("falls back to a usable id when nothing survives slugification", () => {
    expect(createHeadingSlugger()("!!!")).toBe("section");
  });

  it("disambiguates repeated headings", () => {
    const slug = createHeadingSlugger();
    expect(slug("Overview")).toBe("overview");
    expect(slug("Overview")).toBe("overview-1");
    expect(slug("Overview")).toBe("overview-2");
  });

  it("keeps state per document", () => {
    expect(createHeadingSlugger()("Overview")).toBe("overview");
    expect(createHeadingSlugger()("Overview")).toBe("overview");
  });
});

# Yolodocs — Documentation UX Improvements

## What This Is

Improvements to the yolodocs documentation system: multi-tier sidebar navigation, correct page titles from markdown content headers, and flat HTML file output that works reliably on static hosting (GCS, S3, etc.) without clean-URL resolution.

## Core Value

Documentation pages must be navigable, correctly titled, and work when opened in new tabs or visited directly — on any static file hosting.

## Requirements

### Validated

- ✓ CLI generates static GraphQL documentation sites from schema files — existing
- ✓ SolidStart static preset builds and prerenders pages — existing
- ✓ Sidebar navigation with collapsible sections — existing
- ✓ Markdown docs with frontmatter metadata (title, category, order) — existing
- ✓ Hash-based navigation for schema reference page — existing
- ✓ Doc content split into individual .js files to avoid Nitro prerender corruption — existing

### Active

- [ ] 3-level folder-based docs menu hierarchy (category → subcategory → page)
- [ ] Recursive sidebar rendering to support arbitrary nesting up to 3 levels
- [ ] Menu item labels derived from first H1 header in markdown content, not filename
- [ ] Remove redundant page title when markdown content already contains H1
- [ ] Flat HTML file output (e.g., `architecture.html` instead of `architecture/index.html`)
- [ ] Direct URL access works on GCS/S3 static hosting (no clean-URL resolution needed)
- [ ] Split docs into product docs and developer docs sections via folder structure

### Out of Scope

- Hash-based navigation for docs pages — decided against; flat HTML files chosen instead
- Unlimited nesting depth — capped at 3 levels to keep sidebar usable
- GCS infrastructure/bucket configuration changes — solving at code level with flat HTML output
- Custom per-page navigation ordering beyond frontmatter `order` field — existing system sufficient

## Context

- Site is deployed to Google Cloud Storage (GCS) at `https://api.carlforsocial.dev/docs/`
- GCS does not resolve clean URLs (`/docs/architecture` → `architecture/index.html`), causing 404s when opening doc links in new tabs
- Current URL pattern doubles the prefix: base path `/docs/` + route `/docs/{slug}` = `/docs/docs/{slug}`
- Current sidebar only supports 2 levels (section → items with optional children); `SidebarSubGroup` renders children as flat `<a>` links without recursion
- Markdown loader already extracts `title` from frontmatter with filename fallback, but the first H1 in the actual markdown content should be the authoritative title
- Sample docs directory currently has flat files; needs restructuring into `product/` and `developer/` subdirectories

## Constraints

- **Static hosting**: Output must work on any static file server (GCS, S3, Netlify, GitHub Pages) without server-side URL rewriting
- **SolidStart static preset**: Must use Vinxi/SolidStart's static adapter for prerendering
- **Backward compatibility**: Existing docs without folder structure should still work (flat files render as top-level items)
- **Tech stack**: SolidJS, SolidStart, Tailwind CSS v4 — no framework changes

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Flat HTML files over hash navigation | Works on all static hosting without config; preserves individual page URLs for sharing/SEO | — Pending |
| Folder-based hierarchy over frontmatter-based | Simpler mental model; directory structure is the truth; no extra metadata to maintain | — Pending |
| 3-level max nesting | Balances flexibility with sidebar usability; covers category → subcategory → page | — Pending |
| Title from first H1, not filename | Content is authoritative; avoids mismatch between menu label and page heading | — Pending |

---
*Last updated: 2026-02-20 after initialization*

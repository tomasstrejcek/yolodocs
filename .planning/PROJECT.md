# Yolodocs — Documentation UX Improvements

## What This Is

A CLI tool that generates static GraphQL documentation sites from schema files, with multi-tier sidebar navigation (3 levels), content-derived page titles, and flat HTML output that works on any static hosting without URL rewriting.

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
- ✓ 3-level folder-based docs menu hierarchy (section → collapsible group → leaf page) — v1.0
- ✓ Recursive sidebar rendering supporting nesting up to 3 levels — v1.0
- ✓ Menu item labels derived from first H1 header, not filename — v1.0
- ✓ Frontmatter title priority over H1; filename as last fallback — v1.0
- ✓ Redundant H1 suppressed when markdown content already contains H1 — v1.0
- ✓ Flat HTML file output (e.g., `architecture.html` not `architecture/index.html`) — v1.0
- ✓ Direct URL access works on GCS/S3 static hosting without clean-URL resolution — v1.0
- ✓ Sidebar anchor hrefs match flat HTML file paths with `.html` extension — v1.0
- ✓ Active sidebar state handles `.html` extension in URL pathname — v1.0
- ✓ Top-level docs folders become separate sidebar sections — v1.0
- ✓ Folder group labels title-cased from directory names — v1.0
- ✓ Collapsible sidebar groups retain state across navigation (localStorage) — v1.0
- ✓ Sidebar group auto-expands when active page is a child — v1.0
- ✓ Per-page browser tab title ("Page Title — Site Title") — v1.0
- ✓ Build-time slug collision detection with descriptive error — v1.0
- ✓ Search indexes nested doc pages via recursive flattening — v1.0
- ✓ Sample docs restructured into product/ and developer/ sections — v1.0

### Active

(None — next milestone requirements TBD)

### Out of Scope

- Hash-based navigation for docs pages — decided against; flat HTML files chosen instead
- Unlimited nesting depth — capped at 3 levels to keep sidebar usable
- GCS infrastructure/bucket configuration changes — solving at code level with flat HTML output
- Custom per-page navigation ordering beyond frontmatter `order` field — existing system sufficient
- Offline mode — static site already works offline once loaded
- Mobile responsive sidebar — deferred until user demand

## Context

Shipped v1.0 with 4,821 LOC TypeScript/TSX across src/.
Tech stack: SolidJS, SolidStart (static preset), Tailwind CSS v4, Commander.js, graphql-js.
Deployed to Google Cloud Storage at `https://api.carlforsocial.dev/docs/`.
3 phases, 6 plans executed in 14 days. 58 tests passing (26 loader + 32 build).

## Constraints

- **Static hosting**: Output must work on any static file server (GCS, S3, Netlify, GitHub Pages) without server-side URL rewriting
- **SolidStart static preset**: Must use Vinxi/SolidStart's static adapter for prerendering
- **Backward compatibility**: Existing docs without folder structure still work (flat files render as top-level items)
- **Tech stack**: SolidJS, SolidStart, Tailwind CSS v4 — no framework changes

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Flat HTML files over hash navigation | Works on all static hosting without config; preserves individual page URLs for sharing/SEO | ✓ Good — GCS/S3 direct access works |
| Folder-based hierarchy over frontmatter-based | Simpler mental model; directory structure is the truth; no extra metadata to maintain | ✓ Good — intuitive docs organization |
| 3-level max nesting | Balances flexibility with sidebar usability; covers section → group → page | ✓ Good — covers all real-world cases |
| Title from first H1, not filename | Content is authoritative; avoids mismatch between menu label and page heading | ✓ Good — consistent titles throughout |
| localStorage for collapse persistence | Simple, no server needed; keyed by item.id for global uniqueness | ✓ Good — survives navigation |
| Regex H1 detection shared between loader and renderer | Consistent scan-time and render-time behavior with `/^#\s+/m` | ✓ Good — no H1 detection drift |
| `.html` stripping at derivation time | Avoids double-extension bugs; same code path for SSR and browser | ✓ Good — clean URL handling |

---
*Last updated: 2026-02-20 after v1.0 milestone*

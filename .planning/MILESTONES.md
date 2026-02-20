# Milestones

## v1.0 Documentation UX Improvements (Shipped: 2026-02-20)

**Phases completed:** 3 phases, 6 plans
**Timeline:** 14 days (2026-02-06 → 2026-02-20)
**Git range:** feat(01-01) → feat(03-02) | 36 files changed, 3,732 insertions
**LOC:** 4,821 TypeScript/TSX (src/)

**Delivered:** 3-level sidebar navigation, H1-derived titles, flat HTML output for static hosting, collapse persistence, per-page browser titles, and recursive search indexing.

**Key accomplishments:**
1. 3-level sidebar hierarchy with section, collapsible group, and leaf page rendering
2. H1-derived page titles with frontmatter override and filename fallback
3. Flat `.html` file output for GCS/S3 static hosting without URL rewrites
4. localStorage-backed sidebar collapse persistence with auto-expand on direct URL access
5. Per-page browser tab titles and conditional H1 suppression
6. Recursive search indexing of nested doc pages

---


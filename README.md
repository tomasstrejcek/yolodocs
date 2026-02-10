# yolodocs

Generate beautiful, searchable, static documentation sites from GraphQL schemas. No config required.

```
npx -y github:tomasstrejcek/yolodocs --schema schema.graphql --output docs-site
```

## Features

- **Zero config** — point at a schema, get a docs site
- **Static output** — deploy anywhere (GitHub Pages, Netlify, S3, etc.)
- **Full-text search** — powered by Pagefind, works offline
- **Syntax highlighting** — GraphQL and JSON with Monokai-inspired colors
- **Interactive playground** — try queries against your API from the docs
- **Custom docs** — add markdown guides alongside the generated reference
- **Dark theme** — Tailwind-inspired dark UI

## Quick Start

```bash
# From a schema file
npx -y github:tomasstrejcek/yolodocs --schema schema.graphql --output docs-site

# From a live endpoint
npx -y github:tomasstrejcek/yolodocs --introspection-url https://api.example.com/graphql --output docs-site

# Preview
npx serve docs-site
```

## CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `-s, --schema <path>` | Path to GraphQL SDL file | — |
| `--introspection-url <url>` | URL to introspect | — |
| `--introspection-file <path>` | Introspection JSON file | — |
| `-o, --output <path>` | Output directory | `./docs-site` |
| `--title <title>` | Site title | `API Documentation` |
| `--endpoint <url>` | GraphQL endpoint for playground | — |
| `--docs-dir <path>` | Custom markdown docs folder | `./docs` |
| `--base <path>` | Base path prefix for subpath serving (e.g. `/docs`) | — |
| `-c, --config <path>` | Config file path | auto-detected |

## Config File

Create `yolodocs.config.yml` in your project root:

```yaml
title: "My API"
schema: "./schema.graphql"
output: "./docs-site"
endpoint: "https://api.example.com/graphql"
docsDir: "./docs"
base: "/docs"  # optional: serve under a subpath
```

Then just run:

```bash
npx -y github:tomasstrejcek/yolodocs
```

## Custom Docs

Add markdown files to your docs directory with frontmatter:

```markdown
---
title: Authentication
order: 2
---

# Authentication

Your content here. Supports **bold**, `inline code`, tables, blockquotes,
images, and fenced code blocks with syntax highlighting.
```

### Nested Folders

Organize docs into subfolders to create collapsible groups in the sidebar (two levels max):

```
docs/
├── getting-started.md        ← root-level pages appear first
├── authentication.md
├── guides/
│   ├── filtering.md          ← grouped under "Guides"
│   ├── sorting.md
│   └── real-time-updates.md
└── advanced/
    ├── custom-scalars.md     ← grouped under "Advanced"
    └── performance.md
```

Root-level files are listed first, followed by folder groups sorted alphabetically. Each folder becomes a collapsible section in the sidebar, with its name derived from the folder name. Pages within each group are sorted by `order`, then by `title`.

## CI/CD

```yaml
# .github/workflows/docs.yml
name: Docs
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npx -y github:tomasstrejcek/yolodocs --schema schema.graphql --output docs-site --title "My API"
      - uses: actions/upload-pages-artifact@v3
        with:
          path: docs-site
```

## How It Works

1. Parses your GraphQL schema (SDL, introspection URL, or JSON)
2. Generates query/mutation examples with realistic placeholder data
3. Scans your `docs/` folder for custom markdown pages
4. Builds a SolidStart static site with Tailwind CSS
5. Creates a Pagefind search index over all content
6. Outputs a static folder you can deploy anywhere

## Tech Stack

- [SolidStart](https://start.solidjs.com/) (static preset) for the generated site
- [Tailwind CSS](https://tailwindcss.com/) v4 for styling
- [Pagefind](https://pagefind.app/) for search
- [graphql-js](https://github.com/graphql/graphql-js) for schema parsing
- [Commander.js](https://github.com/tj/commander.js) for the CLI
- [marked](https://github.com/markedjs/marked) for markdown rendering

## License

MIT

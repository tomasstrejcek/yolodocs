---
title: Getting Started
order: 1
category: Guides
---

# Getting Started

Generate a beautiful documentation site from your GraphQL schema in under a minute — no install required.

## Quick Start

Run directly from GitHub using `npx`:

```
npx github:tomasstrejcek/yolodocs --schema schema.graphql --output docs-site
```

Then preview it:

```
npx serve docs-site
```

That's it. Open `http://localhost:3000` and you have a full docs site.

## Schema Sources

yolodocs supports three ways to provide your schema:

### 1. SDL File (recommended)

Point to a `.graphql` or `.gql` file:

```
npx github:tomasstrejcek/yolodocs --schema ./schema.graphql --output docs-site
```

### 2. Introspection URL

Fetch the schema from a live GraphQL endpoint:

```
npx github:tomasstrejcek/yolodocs --introspection-url https://api.example.com/graphql --output docs-site
```

### 3. Introspection JSON

Use a saved introspection result:

```
npx github:tomasstrejcek/yolodocs --introspection-file ./introspection.json --output docs-site
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
| `-c, --config <path>` | Config file path | auto-detected |

## Config File

For repeated use, create a `yolodocs.config.yml` in your project root:

```
title: "My API"
schema: "./schema.graphql"
output: "./docs-site"
endpoint: "https://api.example.com/graphql"
docsDir: "./docs"
hideDeprecated: false
expandExampleDepth: 2
```

yolodocs auto-detects `yolodocs.config.yml`, `yolodocs.config.yaml`, or `yolodocs.config.json`. CLI flags override config file values.

Then just run:

```
npx github:tomasstrejcek/yolodocs
```

## Adding Custom Docs

Create markdown files in your docs directory (default `./docs`). Each file needs frontmatter:

```
---
title: Authentication
order: 2
category: Guides
---

# Authentication

Your content here...
```

| Field | Description |
|-------|-------------|
| `title` | Page title shown in sidebar |
| `order` | Sort order within the category |
| `category` | Sidebar group name |

Docs pages appear **before** the schema reference in the sidebar.

## Adding to CI/CD

Generate docs on every push with a GitHub Action:

```
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
      - run: npx github:tomasstrejcek/yolodocs --schema schema.graphql --output docs-site --title "My API"
      - uses: actions/upload-pages-artifact@v3
        with:
          path: docs-site
```

## Adding to package.json

Add a script for convenience:

```json
{
  "scripts": {
    "docs": "npx github:tomasstrejcek/yolodocs --schema schema.graphql --output docs-site --title \"My API\"",
    "docs:preview": "npx serve docs-site"
  }
}
```

Then run `npm run docs` anytime you want to regenerate.

## Next Steps

- Read about [Authentication](/docs/authentication) patterns
- Learn [Pagination](/docs/pagination) for large result sets
- Understand [Error Handling](/docs/error-handling) best practices
- Explore the [API Reference](/reference) generated from your schema

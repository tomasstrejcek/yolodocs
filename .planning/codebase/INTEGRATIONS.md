# External Integrations

**Analysis Date:** 2026-02-20

## APIs & External Services

**GraphQL Schema Introspection:**
- Introspection endpoints - Fetch schema from live GraphQL servers via standard introspection protocol
  - SDK/Client: graphql (buildClientSchema, getIntrospectionQuery, printSchema)
  - Implementation: `src/schema/introspection.ts` - `loadSchemaFromIntrospectionUrl()`
  - Auth: Headers configurable via `introspectionHeaders` in config, supports `${ENV_VAR}` substitution
  - Method: POST request to endpoint with standard introspection query

**GraphQL Query Execution (In-App Playground):**
- User-specified endpoint - Executes GraphQL queries in the generated documentation site playground
  - SDK/Client: Native fetch API (browser Fetch API)
  - Implementation: `src/site/src/lib/playground.ts` - `executeQuery()`
  - Auth: Bearer token or custom headers from localStorage (`src/site/src/lib/auth-store.ts`)
  - User inputs endpoint and optional token in SettingsPanel at runtime

## Data Storage

**Databases:**
- Not applicable - No database integration. Yolodocs generates static sites only.

**File Storage:**
- Local filesystem only
  - Schema input: GraphQL SDL files (`.graphql`) or introspection JSON files
  - Docs input: Markdown files in docs directory (with optional subdirectories for organization)
  - Output: Static HTML/CSS/JS to output directory (default `./docs-site`)

**Caching:**
- Client-side only: localStorage for playground settings
  - `yolodocs_endpoint` - User's last entered GraphQL endpoint
  - `yolodocs_token` - User's bearer token (persisted in `src/site/src/lib/auth-store.ts`)

## Authentication & Identity

**Auth Provider:**
- Custom (no external provider)
  - Implementation: Bearer token via Authorization header in playground
  - Storage: Browser localStorage (`src/site/src/lib/auth-store.ts`)
  - No runtime validation—token is passed to user's GraphQL endpoint as-is

**Introspection Auth:**
- Custom headers with env var substitution
  - Headers defined in config: `introspectionHeaders: { "Authorization": "${GRAPHQL_TOKEN}" }`
  - Resolved at build-time via `resolveEnvVars()` in `src/schema/introspection.ts`

## Monitoring & Observability

**Error Tracking:**
- Not integrated - No external error tracking service

**Logs:**
- Console output only
  - Build progress: 5 steps logged to stdout
  - Errors: Caught and printed with message context
  - No structured logging or external service

## CI/CD & Deployment

**Hosting:**
- Static file hosting required
  - Output is plain HTML/CSS/JS (no server runtime needed)
  - Example: `npx serve docs-site -p 3456` for local preview
  - Can deploy to any static host (Netlify, GitHub Pages, Vercel, etc.)

**CI Pipeline:**
- Not integrated - No built-in CI configuration
  - User is responsible for running `yolodocs` in their CI workflow
  - Output directory can then be deployed

## Environment Configuration

**Required env vars:**
- For introspection headers: Any variables referenced via `${VAR_NAME}` syntax in `introspectionHeaders` config
  - Example: `introspectionHeaders: { Authorization: "${GRAPHQL_TOKEN}" }` requires `GRAPHQL_TOKEN` env var at build time

**Optional env vars:**
- NODE_ENV - Can control build behavior (development vs production)

**Secrets location:**
- Env vars resolved at build-time only (not runtime)
- Introspection tokens: Pass via environment variables, referenced in config
- Playground token: Stored in browser localStorage by user at runtime (not sensitive data, client-controlled)

## Webhooks & Callbacks

**Incoming:**
- None - Yolodocs does not expose any HTTP endpoints

**Outgoing:**
- Introspection endpoint: POST request to user-specified GraphQL endpoint during build (`loadSchemaFromIntrospectionUrl()`)
- Playground queries: POST requests from browser to user-specified endpoint during documentation browsing (user-initiated)

---

*Integration audit: 2026-02-20*

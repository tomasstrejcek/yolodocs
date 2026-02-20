---
title: Authentication
order: 2
category: Guides
---

# Authentication

All API requests require a valid JWT token passed in the `Authorization` header.

## Overview

The Carl API supports two authentication methods:

| Method | Use Case | Header |
|--------|----------|--------|
| **JWT Token** | Browser & mobile apps | `Authorization: Bearer <token>` |
| **API Key** | Server-to-server | `X-API-Key: <key>` |

## Obtaining a Token

Authenticate via the `login` mutation to receive a JWT:

```graphql
mutation Login {
  login(input: { email: "user@example.com", password: "***" }) {
    token
    expiresAt
    user {
      id
      name
      role
    }
  }
}
```

The returned `token` should be included in all subsequent requests.

## Using Your Token

Add the token to the `Authorization` header as a Bearer token:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Example with curl

```
curl -X POST https://api.carl.com/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"query": "{ getMyAccounts { data { id name } } }"}'
```

## Token Expiration

Tokens expire after **24 hours** by default. When a token expires, the API returns a `401 Unauthorized` error with the code `UNAUTHENTICATED`.

To handle expiration:

1. Store the `expiresAt` timestamp from the login response
2. Proactively refresh before expiration
3. On `401` errors, re-authenticate and retry the failed request

> **Tip:** Implement a token refresh interceptor in your HTTP client to handle expiration transparently.

## API Key Authentication

For server-to-server integrations, you can use an API key instead of a JWT. Pass it in the `X-API-Key` header:

```
X-API-Key: your-api-key-here
```

API keys **do not expire** but can be revoked at any time. They have the same permissions as the user who created them.

### Generating an API Key

1. Log into the Carl dashboard
2. Navigate to **Settings** → **API Keys**
3. Click **Generate New Key**
4. Copy the key immediately — it won't be shown again

> **Warning:** Treat API keys like passwords. Never commit them to version control or expose them in client-side code.

---

*For error handling related to authentication failures, see the [Error Handling](/docs/developer/error-handling) guide.*

---
title: Error Handling
order: 4
category: Guides
---

# Error Handling

The API follows the standard GraphQL error format. Errors are returned in the `errors` array alongside any partial `data`.

## Error Response Format

```json
{
  "data": null,
  "errors": [
    {
      "message": "Account not found",
      "path": ["getAccount"],
      "extensions": {
        "code": "NOT_FOUND",
        "statusCode": 404
      }
    }
  ]
}
```

## Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHENTICATED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource does not exist |
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## Handling Errors in Code

Always check for the `errors` array in the response before accessing `data`:

```graphql
query GetAccount {
  getAccount(id: "123") {
    id
    name
    handle
  }
}
```

If the account does not exist, the response will include an error with code `NOT_FOUND` rather than throwing an exception.

## Validation Errors

When input validation fails, the error `extensions` include details about which fields failed:

```json
{
  "errors": [
    {
      "message": "Validation failed",
      "extensions": {
        "code": "VALIDATION_ERROR",
        "fields": {
          "email": "Must be a valid email address",
          "name": "Required, minimum 2 characters"
        }
      }
    }
  ]
}
```

## Rate Limiting

The API allows **100 requests per minute** per authenticated user. When rate-limited:

1. Check the `Retry-After` response header for the wait duration
2. Implement exponential backoff in your client
3. Consider batching multiple operations into a single request

> **Tip:** Use GraphQL's ability to combine multiple queries in one request to reduce your rate limit usage.

## Best Practices

- **Always handle errors gracefully** — never assume a request will succeed
- **Log error codes** — the `extensions.code` field is stable and machine-readable
- **Display user-friendly messages** — don't expose raw error messages to end users
- **Retry transient errors** — `INTERNAL_ERROR` and `RATE_LIMITED` are often temporary

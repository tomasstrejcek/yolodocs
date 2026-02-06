---
title: Getting Started
order: 1
category: Guides
---

# Getting Started with the Carl API

Welcome to the **Carl API** documentation. This guide will help you get started quickly with our GraphQL API for managing social media accounts, campaigns, and brand collaborations.

![Carl API Architecture](https://placehold.co/800x300/0f172a/66D9EF?text=Carl+API+Architecture&font=source-sans-pro)

## Prerequisites

Before you begin, make sure you have:

- A Carl platform account with API access enabled
- An HTTP client that supports GraphQL (e.g., `curl`, Postman, or any GraphQL IDE)
- Your API credentials (email + password, or an API key)

> **Note:** If you don't have API access yet, contact your account manager or visit the [developer portal](#) to request access.

## Authentication

All API requests require authentication. Include your JWT token in the `Authorization` header:

```
Authorization: Bearer YOUR_TOKEN
```

See the [Authentication](/docs/authentication) guide for full details on obtaining and managing tokens.

## Making Your First Query

Here's a simple query to get your accounts:

```graphql
query GetMyAccounts {
  getMyAccounts {
    data {
      id
      name
      handle
      socialNetwork
    }
  }
}
```

The response will include all social media accounts linked to your user:

```json
{
  "data": {
    "getMyAccounts": {
      "data": [
        {
          "id": "acc_12345",
          "name": "My Brand Page",
          "handle": "@mybrand",
          "socialNetwork": "INSTAGRAM"
        }
      ]
    }
  }
}
```

## Quick Reference

| Action | Query/Mutation | Description |
|--------|---------------|-------------|
| List accounts | `getMyAccounts` | Retrieve all linked social accounts |
| Get campaign | `getCampaign` | Fetch a specific campaign by ID |
| Create post | `createPost` | Schedule or publish a new post |
| Invite creator | `inviteCreator` | Send a collaboration invite |

## Next Steps

1. Explore the [API Reference](/reference) for all available queries and mutations
2. Read the [Authentication](/docs/authentication) guide for token management
3. Learn about [Pagination](/docs/pagination) for handling large result sets
4. Understand [Error Handling](/docs/error-handling) patterns

---

*Need help? Reach out to our developer support team at `api-support@carl.com`.*

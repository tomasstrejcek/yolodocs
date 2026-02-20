---
title: Performance Tips
order: 2
---

# Performance Tips

Optimize your GraphQL queries for faster responses and lower server load.

## Request Only What You Need

Select only the fields you use. Avoid deep nesting when possible:

```graphql
# Good - specific fields
query {
  user(id: "123") {
    name
    email
  }
}

# Avoid - over-fetching
query {
  user(id: "123") {
    name
    email
    orders {
      items {
        product {
          reviews {
            author { ... }
          }
        }
      }
    }
  }
}
```

## Use Pagination

Always paginate list queries to avoid loading thousands of records:

```graphql
query {
  products(first: 20, after: "cursor123") {
    edges {
      node {
        id
        name
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

## Batch Related Queries

Combine multiple queries into a single request:

```graphql
query DashboardData {
  currentUser {
    name
    avatar
  }
  recentOrders(first: 5) {
    id
    total
  }
  notifications(unread: true) {
    id
    message
  }
}
```

## Caching

Use the `id` field to enable client-side caching. Most GraphQL clients (Apollo, urql) use `id` + `__typename` as cache keys automatically.

## Query Complexity

Be mindful of query depth and breadth. The API may enforce limits on:

- **Max depth**: How many levels of nesting are allowed
- **Max complexity**: Total cost of the query based on field weights
- **Rate limiting**: Requests per minute per API key

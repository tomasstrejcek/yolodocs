---
title: Filtering
order: 1
---

# Filtering

Most list queries support filtering to narrow down results. Filters are passed as arguments to the query.

## Basic Filtering

Use the `where` argument to filter by field values:

```graphql
query {
  users(where: { status: ACTIVE }) {
    id
    name
    email
  }
}
```

## Multiple Conditions

Combine filters with logical operators:

```graphql
query {
  orders(where: { status: COMPLETED, createdAt_gte: "2024-01-01" }) {
    id
    total
    createdAt
  }
}
```

## Available Operators

| Operator | Description |
|----------|-------------|
| `_eq` | Equal to |
| `_neq` | Not equal to |
| `_gt` | Greater than |
| `_gte` | Greater than or equal |
| `_lt` | Less than |
| `_lte` | Less than or equal |
| `_in` | In a list of values |
| `_contains` | String contains |

## Nested Filtering

Filter on related objects:

```graphql
query {
  orders(where: { customer: { country: "US" } }) {
    id
    total
  }
}
```

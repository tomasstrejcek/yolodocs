---
title: Sorting
order: 2
---

# Sorting

Control the order of results using the `orderBy` argument.

## Basic Sorting

Sort by a single field:

```graphql
query {
  users(orderBy: { createdAt: DESC }) {
    id
    name
    createdAt
  }
}
```

## Multiple Sort Fields

Chain sort criteria for tie-breaking:

```graphql
query {
  products(orderBy: [{ category: ASC }, { price: DESC }]) {
    id
    name
    category
    price
  }
}
```

## Sort Directions

| Direction | Description |
|-----------|-------------|
| `ASC` | Ascending (A-Z, 0-9, oldest first) |
| `DESC` | Descending (Z-A, 9-0, newest first) |

## Combining with Filters

Sorting works alongside filtering:

```graphql
query {
  orders(where: { status: COMPLETED }, orderBy: { total: DESC }) {
    id
    total
    customer {
      name
    }
  }
}
```

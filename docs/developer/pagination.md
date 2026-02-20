---
title: Pagination
order: 3
category: Guides
---

# Pagination

List endpoints return paginated results. The API uses **cursor-based pagination** for consistent, efficient traversal of large datasets.

![Pagination Flow](https://placehold.co/800x200/0f172a/A6E22E?text=Page+1+→+Page+2+→+Page+3&font=source-sans-pro)

## Basic Usage

Pass `first` (page size) and `after` (cursor) arguments:

```graphql
query ListAccounts {
  getMyAccounts(first: 10, after: "cursor_abc123") {
    data {
      id
      name
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

## Page Info

Every paginated response includes a `pageInfo` object:

| Field | Type | Description |
|-------|------|-------------|
| `hasNextPage` | `Boolean` | Whether more results exist |
| `hasPreviousPage` | `Boolean` | Whether previous results exist |
| `endCursor` | `String` | Cursor for the last item (use as `after`) |
| `startCursor` | `String` | Cursor for the first item (use as `before`) |

## Iterating Through Pages

To fetch all pages, loop until `hasNextPage` is `false`:

1. Make the initial request **without** an `after` argument
2. Read `pageInfo.endCursor` from the response
3. Pass it as the `after` argument in the next request
4. Repeat until `hasNextPage` is `false`

> **Warning:** Avoid fetching all pages in a tight loop. Add a small delay between requests to stay within rate limits.

## Default Page Size

If `first` is not specified, the API returns **20 items** by default. The maximum page size is **100**.

```graphql
# Fetch maximum page size
query LargeList {
  getMyAccounts(first: 100) {
    data { id name }
    pageInfo { hasNextPage endCursor }
  }
}
```

## Sorting

Some list queries support an `orderBy` argument:

```graphql
query SortedAccounts {
  getMyAccounts(first: 20, orderBy: { field: CREATED_AT, direction: DESC }) {
    data {
      id
      name
      createdAt
    }
  }
}
```

---

*For more information on optimizing data fetching, see the [Error Handling](/docs/developer/error-handling) guide for retry strategies.*

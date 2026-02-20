---
title: Custom Scalars
order: 1
---

# Custom Scalars

This API uses custom scalar types beyond the built-in `String`, `Int`, `Float`, `Boolean`, and `ID`.

## DateTime

ISO 8601 date-time string (e.g. `"2024-03-15T10:30:00Z"`).

```graphql
query {
  events(after: "2024-01-01T00:00:00Z") {
    id
    name
    startsAt  # DateTime scalar
  }
}
```

## JSON

Arbitrary JSON data. Useful for flexible metadata fields:

```graphql
mutation {
  updateSettings(input: { preferences: { theme: "dark", locale: "en" } }) {
    id
    preferences  # JSON scalar
  }
}
```

## BigInt

Large integer values beyond the standard 32-bit `Int` range:

```graphql
query {
  analytics {
    totalPageViews  # BigInt scalar
    uniqueVisitors
  }
}
```

## Working with Custom Scalars

Custom scalars are serialized as strings or numbers in JSON responses. Your client should parse them into appropriate native types:

| Scalar | JSON Type | Example |
|--------|-----------|---------|
| `DateTime` | String | `"2024-03-15T10:30:00Z"` |
| `JSON` | Object/Array | `{"key": "value"}` |
| `BigInt` | String | `"9007199254740993"` |

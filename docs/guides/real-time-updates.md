---
title: Real-Time Updates
order: 3
---

# Real-Time Updates

Use GraphQL subscriptions to receive live data updates over WebSocket connections.

## Setting Up Subscriptions

Subscribe to events using the `subscription` operation type:

```graphql
subscription {
  orderCreated {
    id
    total
    customer {
      name
    }
  }
}
```

## Filtered Subscriptions

Narrow down which events you receive:

```graphql
subscription {
  orderUpdated(where: { status: SHIPPED }) {
    id
    status
    trackingNumber
  }
}
```

## Client Integration

Most GraphQL clients support subscriptions out of the box:

```javascript
const client = new GraphQLClient({
  url: "https://api.example.com/graphql",
  wsUrl: "wss://api.example.com/graphql",
});

client.subscribe({
  query: `subscription { orderCreated { id total } }`,
  onData: (data) => console.log("New order:", data),
});
```

## Best Practices

- **Unsubscribe** when the component unmounts to avoid memory leaks
- **Reconnect** automatically on connection drops
- **Debounce** rapid updates on the client side
- Use **filtered subscriptions** to reduce unnecessary traffic

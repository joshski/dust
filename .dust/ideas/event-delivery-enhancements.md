# Event Delivery Enhancements

Optional configuration for more robust event delivery in `dust loop claude`.

## Context

The current HTTP POST events implementation is fire-and-forget: each event is sent immediately without retries, batching, or throttling. This is simple and appropriate for basic monitoring, but some users may need stronger delivery guarantees.

## Potential settings

```json
{
  "eventsUrl": "https://example.com/events",
  "eventsRetries": 3,
  "eventsBatchSize": 10,
  "eventsBatchDelayMs": 1000
}
```

## Considerations

### Retries
- Could help with transient network failures
- Risk: ordering issues if event N+1 succeeds while event N is retrying
- Possible solution: retry queue that preserves order, or accept out-of-order delivery

### Batching
- Reduces HTTP overhead for high-frequency events
- Trade-off: adds latency, reducing real-time visibility
- May be useful if events endpoint has rate limits

### Throttling
- Currently unnecessary given low event frequency (seconds between events)
- Could become relevant if we add more granular events in the future

## Recommendation

Wait for real usage feedback before implementing. The current simple approach covers the primary use case (monitoring dashboards, notifications). Users needing stronger guarantees can point to a robust ingestion endpoint (queue service, log aggregator) that handles delivery concerns.

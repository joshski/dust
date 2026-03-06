# Command Events Transport

Dust command events support two fire-and-forget transports.

1. `DUST_EVENTS_FD` (legacy): writes newline-delimited `CommandEventMessage` JSON to a file descriptor.
2. `DUST_PROXY_PORT` (local proxy): HTTP `POST` to `http://127.0.0.1:<port>/events`.

## Bucket Proxy Behavior

When `dust bucket` starts successfully, it also starts a local HTTP server on an ephemeral localhost port and sets `DUST_PROXY_PORT` in its process environment for descendants.

- Endpoint: `POST /events`
- Accepted payload: a JSON `CommandEventMessage` shape (`sequence`, `timestamp`, and `event.type`)
- Forwarding: accepted payloads are relayed over the active bucket WebSocket channel as JSON messages
- Response codes:
  - `202` for accepted/forwarded payloads
  - `400` for invalid JSON or invalid payload shape
  - `405` for non-`POST` methods on `/events`
  - `404` for unknown paths
  - `413` for oversized payloads

`DUST_PROXY_PORT` is restored to its previous value (or unset) when `dust bucket` exits.

## Error Handling

Proxy delivery is non-blocking. If the proxy endpoint is unreachable or responds with a non-2xx status, the command logs an `Event proxy POST failed ...` message to stderr and continues.

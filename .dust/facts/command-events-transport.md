# Command Events Transport

Dust command events use proxy-first transport via `DUST_PROXY_PORT` (local proxy): HTTP `POST` to `http://127.0.0.1:<port>/events`.

## Bucket Proxy Behavior

When `dust bucket` starts successfully, it also starts a local HTTP server on an ephemeral localhost port and sets `DUST_PROXY_PORT` in its process environment for descendants.

- Endpoint: `POST /events`
- Accepted payload: a JSON `CommandEventMessage` shape (`sequence`, `timestamp`, and `event.type`)
- Forwarding: accepted payloads are relayed over the active bucket WebSocket channel as JSON messages
- Additional endpoint: `GET /tools`
- Tool-list response: `{ "tools": ToolDefinition[] }` from the active in-memory bucket session
- Additional endpoint: `POST /tools/:name`
- Tool payload: `{ "arguments": string[], "repositoryId": string }`
- Tool forwarding: proxy sends `tool-execution-request` over the active bucket WebSocket and returns HTTP JSON from the matching `tool-execution-result`
- Response codes:
  - `202` for accepted/forwarded payloads
  - `400` for invalid JSON or invalid payload shape
  - `405` for unsupported methods on `/events`, `/tools`, and `/tools/:name`
  - `404` for unknown paths
  - `413` for oversized payloads
  - Tool execution: `200` (`success`), `404` (`tool-not-found`), `502` (`error`)

`DUST_PROXY_PORT` is restored to its previous value (or unset) when `dust bucket` exits.

## Error Handling

Proxy delivery is non-blocking. If the proxy endpoint is unreachable or responds with a non-2xx status, the command logs an `Event proxy POST failed ...` message to stderr and continues.

# Local Proxy Server for Bucket

Run a local HTTP server in `dust bucket` for child-to-parent communication. This handles both tool execution and event reporting over a single endpoint, replacing `tools.json` disk storage and the `DUST_EVENTS_FD` pipe approach.

## Current State

Child processes spawned by `dust bucket` need to communicate back to the parent in two ways:

1. **Tool execution**: `dust bucket tool asset-upload` currently runs as a separate process that loads tool definitions from `~/.dust/tools.json`, authenticates independently, and makes direct HTTP requests to the dustbucket server.

2. **Event reporting**: Dust commands like `dust check` and `dust next` can emit structured `CommandEvent`s via `DUST_EVENTS_FD`, but nothing currently sets this env var in production. The FD pipe approach requires direct parent-child file descriptor inheritance, which is fragile across process trees (Claude spawns a shell, shell spawns `dust check`).

## Proposed Changes

### 1. Local HTTP server in `dust bucket`

When `dust bucket` starts, it spins up a local HTTP server on an ephemeral port. The port is passed to agent child processes via an environment variable (e.g. `DUST_PROXY_PORT`). Any subprocess at any depth can reach it.

### 2. Tool execution endpoint

`POST localhost:$DUST_PROXY_PORT/tools/:name` accepts tool parameters and file data. The proxy forwards the request over the WebSocket as a `tool-execute` message, waits for the `tool-result` response, and returns it as an HTTP response. No auth needed — the proxy is local.

`dust bucket tool asset-upload <file>` would POST to this endpoint instead of loading `tools.json` and making direct HTTP requests to the server.

### 3. Event reporting endpoint

`POST localhost:$DUST_PROXY_PORT/events` accepts `CommandEvent` payloads. The proxy wraps them into `EventMessage` envelopes and sends them over the WebSocket. Fire-and-forget from the caller's perspective.

Dust commands would check for `DUST_PROXY_PORT` (instead of `DUST_EVENTS_FD`) and POST events to the local server. This works from any subprocess depth without file descriptor inheritance.

### 4. Remove `tools.json` and `DUST_EVENTS_FD`

With both tools and events going through the proxy, `tool-storage.ts`, `~/.dust/tools.json`, and the FD pipe code path are no longer needed. Tool definitions received over WebSocket are held in memory by the `dust bucket` process for prompt injection.

## Open Questions

### Should the proxy also serve tool definitions?

#### Yes — expose a GET endpoint

`GET localhost:$DUST_PROXY_PORT/tools` returns the current tool definitions. This would let the tool CLI validate tool names and parameters locally before sending. The loop command could also query this instead of reading from disk.

#### No — keep it simple

The proxy only handles execution and events. Tool definitions for prompts are passed via environment or kept in memory. Fewer endpoints to maintain.

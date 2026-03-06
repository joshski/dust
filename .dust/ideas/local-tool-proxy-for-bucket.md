# Local Tool Proxy for Bucket

Replace the current `tools.json` disk-based approach with a local proxy server that `dust bucket` runs, so that `dust bucket tool` commands execute via the parent's WebSocket connection instead of making independent HTTP requests.

## Current State

When an agent calls `dust bucket tool asset-upload`, it runs as a separate process that:
1. Loads tool definitions from `~/.dust/tools.json`
2. Authenticates independently (token from env or `~/.dust/credentials.json`)
3. Makes a direct HTTP request to the dustbucket server

This requires persisting tool definitions to disk and duplicating auth logic in the tool executor.

## Proposed Changes

### 1. Local HTTP server in `dust bucket`

When `dust bucket` starts, it spins up a local HTTP server on an ephemeral port. The port is passed to agent child processes via an environment variable (e.g. `DUST_TOOL_PROXY_PORT`).

### 2. Rewrite `dust bucket tool` to use the proxy

Instead of loading `tools.json` and making direct HTTP requests, `dust bucket tool asset-upload <file>` would POST to `localhost:$DUST_TOOL_PROXY_PORT/asset-upload` with the file data. No auth needed — the proxy is local.

### 3. Proxy forwards over WebSocket

The local proxy receives the request, wraps it as a `tool-execute` WebSocket message (with a `requestId`), sends it to the server, waits for the `tool-result` response, and returns it to the CLI process as an HTTP response.

### 4. Remove `tools.json` storage

With tools executing via the proxy, `tool-storage.ts` and `~/.dust/tools.json` are no longer needed. Tool definitions are still received over WebSocket for prompt injection but don't need to be persisted to disk — they can be held in memory by the `dust bucket` process.

## Open Questions

### Should the proxy also serve tool definitions?

#### Yes — expose a GET endpoint

`GET localhost:$DUST_TOOL_PROXY_PORT/tools` returns the current tool definitions. This would let the tool CLI validate tool names and parameters locally before sending. It also provides an alternative to in-memory storage for prompt injection — the loop command could query the proxy instead of reading from disk.

#### No — keep it simple

The proxy only handles execution. Tool definitions for prompts are passed via environment or kept in memory. Fewer endpoints to maintain.

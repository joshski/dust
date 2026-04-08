# WebSocket keepalive ping for idle bucket connections

The bucket worker's WebSocket connection to dustbucket.com is dropped by an intermediate proxy every ~15 minutes when idle. Users see repeating cycles of `WebSocket error:` / `bucket.disconnected code=1006 reason=none` / `Reconnecting in 1 seconds...` in their logs. The reconnection logic handles this gracefully, but the churn is noisy and wastes connection resources.

The existing `agent-session-activity` heartbeat only fires during active agent sessions. When the worker is idle (waiting for tasks), no traffic flows over the WebSocket, triggering proxy idle timeouts.

Adding a periodic WebSocket-level ping (e.g., every 30-60 seconds) would keep the connection alive during idle periods and eliminate the disconnect/reconnect noise.

## Open Questions

### Where should the ping originate?

#### Client-side ping in bucket-worker

The worker sends a periodic ping frame or application-level ping message. Simple to implement and works regardless of server changes.

#### Server-side ping from dustbucket.com

The server sends pings to all connected agents. More conventional for WebSocket servers, and a single server change fixes all clients. But requires a server deployment.

#### Both sides

The server sends pings and the client has a fallback ping in case the server's pings aren't enough for all intermediate proxies. Most robust but more complex.

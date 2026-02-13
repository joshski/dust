# Add `dust bucket` entry point command

Implement the `dust bucket <token>` command that connects to dustbucket via WebSocket and spawns the container process.

## Requirements

1. Add a new command at `lib/cli/commands/bucket.ts`
2. Accept a `<token>` argument for authentication
3. Establish a WebSocket connection to `wss://dustbucket.com/ws` with the token in the Authorization header
4. Parse incoming `repository-list` events from the server
5. Spawn the container process (`dust bucket container`) passing the token via `DUST_API_TOKEN` environment variable
6. Handle WebSocket reconnection with exponential backoff on disconnect
7. Exit gracefully on `q` keypress or SIGINT/SIGTERM

## Implementation Notes

- Use native `WebSocket` (available in Bun) - no external dependencies
- Follow the dependency injection pattern from `loop.ts` for testability
- The container should be spawned using a fresh invocation (ensures dust updates are picked up)
- The entry point does NOT directly manage repositories - it just maintains the connection and spawns the container

## Testing

- Unit tests with injectable WebSocket and spawn dependencies
- Test reconnection behavior
- Test graceful shutdown

## Goals

- [Dependency Injection](../goals/dependency-injection.md)
- [Minimal Dependencies](../goals/minimal-dependencies.md)
- [Unit Test Coverage](../goals/unit-test-coverage.md)
- [Decoupled Code](../goals/decoupled-code.md)

## Blocked By

(none)

## Definition of Done

- [ ] `dust bucket <token>` establishes WebSocket connection with authentication
- [ ] Container process is spawned with token in environment
- [ ] WebSocket automatically reconnects on disconnect
- [ ] Graceful shutdown on user interrupt
- [ ] Unit tests cover connection, spawning, and reconnection

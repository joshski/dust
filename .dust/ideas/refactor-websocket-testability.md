# Refactor WebSocket and bucket code for testability (imperative shell, functional core)

The bucket WebSocket code mixes decision logic with side effects in several key areas,
making tests require full mock WebSocket wiring even when the thing being tested is a
simple branching decision. Extracting pure functions from the imperative handlers would
make each piece independently testable.

## Current state

The codebase already does DI well (`BucketDependencies`, `RepositoryDependencies`,
`WebSocketLike` abstraction) and has a 1.46:1 test-to-code ratio. But within the
imperative shell, decision logic and effects are still tangled together.

## Proposed extractions

### 1. Reconnection decision from `onclose` handler

`bucket.ts` `connectWebSocket` `onclose` (lines ~490-537) mixes reconnection decisions
with state mutation, logging, and `setTimeout` scheduling.

Extract a pure function:

```typescript
type ReconnectDecision =
  | { action: 'no_reconnect'; reason: string }
  | { action: 'reconnect'; delay: number; nextDelay: number }

function decideReconnect(
  closeCode: number,
  shuttingDown: boolean,
  currentDelay: number,
  maxDelay: number
): ReconnectDecision
```

The `onclose` handler becomes a thin shell that calls this and acts on the result.

### 2. WebSocket message parsing from `onmessage` handler

`bucket.ts` `connectWebSocket` `onmessage` (lines ~549-611) parses JSON, routes by
message type, and triggers async operations in one callback.

Extract a pure function:

```typescript
type IncomingMessage =
  | { type: 'repository-list'; repos: unknown[] }
  | { type: 'task-available'; repository: string }
  | { type: 'unknown'; raw: unknown }

type MessageParseResult =
  | { ok: true; message: IncomingMessage }
  | { ok: false; raw: string }

function parseServerMessage(data: string): MessageParseResult
```

Message parsing and validation become testable without any WebSocket infrastructure.

### 3. Agent status derivation and event message building from `runRepositoryLoop`

`repository-loop.ts` `onAgentEvent` callback (~lines 126-152) mutates
`repoState.agentStatus`, formats/logs the event, builds an `EventMessage`, and sends it.

Extract two pure functions:

```typescript
function agentStatusFromEvent(event: AgentSessionEvent): 'busy' | 'idle' | null

function buildEventMessage(
  event: AgentSessionEvent,
  sequence: number,
  sessionId: string,
  repository: string,
  agentSessionId?: string
): EventMessage
```

### 4. Remove direct `process.env` reads from `resolveToken` and `getWebSocketUrl`

`resolveToken` (bucket.ts ~line 727) reads `DUST_BUCKET_TOKEN` directly while the rest
of the auth chain uses injected deps. `getWebSocketUrl` (bucket.ts ~line 300) reads
`DUST_BUCKET_AGENT_CONNECT_URL` directly. Both force tests to use `stubEnv`/`restoreEnv`.

Pass these through `BucketDependencies` or as function parameters for consistency with
the rest of the system.

## Summary of extractions

| Current location | Pure function to extract | What it replaces |
|---|---|---|
| `onclose` handler | `decideReconnect(code, shuttingDown, delay, max)` | Reconnection branching + backoff calc |
| `onmessage` handler | `parseServerMessage(data)` | JSON parsing + type routing |
| `onAgentEvent` callback | `agentStatusFromEvent(event)` + `buildEventMessage(...)` | Status mutation + message construction |
| `resolveToken` | Accept env token as parameter | Direct `process.env` read |
| `getWebSocketUrl` | Accept via deps or parameter | Direct `process.env` read |

## Open Questions

### Should env-var reads move into `BucketDependencies` or become function parameters?

#### Add to BucketDependencies
Consistent with how `getReposDir` already works. Keeps function signatures simple. But
adds more fields to an already large interface.

#### Pass as function parameters
Simpler, no interface changes. The caller (the `bucket` entry point) resolves env vars
once and threads them through. But adds parameters to several function signatures.

### How far to push the pattern in `connectWebSocket`?

#### Extract just the decision functions (recommended)
Pull out `decideReconnect` and `parseServerMessage`. Keep the handler structure as-is
but make each handler call the pure function then execute effects. Minimal diff, clear
win.

#### Restructure into an action/effect pattern
Define a `WebSocketAction` union type for all side effects. Handlers return actions,
a single executor dispatches them. More thorough separation but a larger refactor with
more indirection.

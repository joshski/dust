# Send events to dust bucket host in `dust loop`

Integrate `dust loop` with the bucket service so events are sent automatically using an authenticated token.

## Background

Currently, `dust loop claude` and `dust loop codex` can send events over HTTP POST to an arbitrary URL via the `eventsUrl` setting (`.dust/config/settings.json`) or the `DUST_EVENTS_URL` environment variable. This is a low-level escape hatch that requires users to configure their own endpoint.

The bucket service (`dustbucket.com`) already provides a WebSocket-based event stream used by `dust bucket`. The idea is to bring that integration into `dust loop`, so events are sent directly to the bucket service using authenticated HTTP POST calls — instead of a bare, unauthenticated URL.

## Proposed Behaviour

1. **Check for a bucket token** at startup (same precedence as `dust bucket`):
   - `DUST_BUCKET_TOKEN` env var (takes precedence)
   - Stored credential at `~/.dust/credentials.json`
   - `DUST_BUCKET_HOST` env var overrides the default host (`https://dustbucket.com`)

2. **If no token is configured**, display a terminal UI menu (hand-rolled with ANSI codes, no library) offering two choices:
   - "Yes, connect to dustbucket" → trigger browser-based OAuth flow (same as `dust bucket` → `resolveToken`) and store the token
   - "No, skip" → continue the loop without sending events

3. **If a token is available**, send events without prompting.

4. **Event delivery** uses a WebSocket connection to the bucket service (same transport as `dust bucket`). This also enables the server to push `task-available` signals, so `dust loop` can sleep indefinitely between iterations instead of polling on a fixed interval.

5. **Remove `DUST_EVENTS_URL` env var and `eventsUrl` settings** — the bucket service replaces this mechanism. This includes:
   - `settings.eventsUrl` field and `validateDustEventsUrl()` in `lib/config/settings.ts`
   - All three `DUST_EVENTS_URL` env var overrides in `loadSettings`
   - `PostEventFn` / `defaultPostEvent` / `createWireEventSender` in `lib/cli/commands/loop.ts` (replaced by bucket-aware sender)
   - References in the `dust-event-protocol.md` fact file and the `configuration-system.md` fact file

### Shared WebSocket infrastructure

`dust bucket` already implements WebSocket connection management in `lib/cli/commands/bucket.ts`: `connectWebSocket()` handles connect, reconnect with exponential backoff, and message dispatch. This logic is currently interleaved with bucket-specific state (`BucketState`, TUI, repository management).

To share the WebSocket transport between `dust loop` and `dust bucket`, extract a reusable connection manager into `lib/bucket/connection.ts` (or similar) that handles:

- **Connect with auth** — `WebSocketLike` creation with `Authorization: Bearer` header
- **Reconnect with backoff** — exponential backoff from 1s to 30s (currently hardcoded in `bucket.ts` as `INITIAL_RECONNECT_DELAY_MS` / `MAX_RECONNECT_DELAY_MS`)
- **Send events** — `createEventMessageSender()` already exists in `lib/bucket/events.ts` and is transport-agnostic (takes `() => WebSocketLike | null`)
- **Receive messages** — dispatch parsed server messages to a callback; `dust loop` only needs `task-available`, while `dust bucket` also handles `repository-list`

The extracted interface might look like:

```ts
interface BucketConnection {
  sendEvent: SendEventFn
  onMessage: (handler: (msg: ServerMessage) => void) => void
  close: () => void
}
```

`dust bucket` would use this plus its TUI/repository orchestration on top. `dust loop` would use it with a simpler message handler that just wakes the loop on `task-available`.

### Relevant code

- `lib/cli/commands/loop.ts` — `loopClaude()`, `createWireEventSender()`, `createDefaultDependencies()`; currently reads `settings.eventsUrl` to decide whether to send events
- `lib/cli/commands/bucket.ts` — `connectWebSocket()`, `waitForConnection()`, `resolveToken()`, reconnect logic; candidates for extraction
- `lib/bucket/events.ts` — `createEventMessageSender()`, `WebSocketLike`, `SendEventFn`; already reusable
- `lib/bucket/server-messages.ts` — `parseServerMessage()`, `ServerMessage` types; already reusable
- `lib/bucket/auth.ts` — `loadStoredToken()`, `storeToken()`, `authenticate()`, `getDustbucketHost()`
- `lib/config/settings.ts` — `eventsUrl` setting, `validateDustEventsUrl()`, `DUST_EVENTS_URL` overrides (to be removed)
- `lib/bucket/terminal-ui.ts` — existing hand-rolled ANSI terminal UI (tabs, key input, status dots); a simpler menu component would follow the same pattern (no external library)

### Principles alignment

- [Easy Adoption](../principles/easy-adoption.md) — removing the `eventsUrl` escape hatch reduces configuration surface; the prompt-on-first-run model is friendlier
- [Unsurprising UX](../principles/unsurprising-ux.md) — users running `dust loop` shouldn't need to know about `DUST_EVENTS_URL` to get events into the bucket
- [Progressive Disclosure](../principles/progressive-disclosure.md) — the menu only appears when a decision is needed; once configured it is silent
- [Minimal Dependencies](../principles/minimal-dependencies.md) — no new library; terminal menu uses raw ANSI codes

## Open Questions

### How should the bucket server distinguish between single-repo and multi-repo clients?

#### Use existing repository field with implicit registration

Events already include a `repository` field. The server can infer the client mode from the events it receives — if events arrive for a repository not in the user's managed list, it's a standalone loop. No protocol change needed; the server just associates events with whatever repository name is provided.

#### Add a client type field to the connection handshake

Introduce a `clientType` field (`'loop'` | `'bucket'`) sent during WebSocket connection (either in headers or as an initial message). The server can then apply different behaviors (e.g., `dust bucket` receives `repository-list` messages; `dust loop` only receives `task-available` for its single repo).

#### Use different WebSocket endpoints

Route `dust loop` connections to a dedicated endpoint (e.g., `/agent/loop`) while `dust bucket` continues to use `/agent/connect`. The server applies different handlers based on the endpoint. Keeps connection logic distinct but adds endpoint proliferation.

### How should `dust loop` behave when stdin is not a TTY?

#### Skip prompt and continue without event sending

For CI/background runs, skip the menu and run normally without event forwarding when token setup cannot be prompted.

#### Treat missing token as an error

Fail fast when event sending is configured but auth cannot be completed interactively.

### Should `dust loop codex` and `dust loop claude` share the same bucket behavior?

#### Keep one shared implementation

`loopClaude` already handles both via `agentType`, so the bucket integration can stay agent-agnostic unless a concrete divergence appears.

#### Add codex-specific behavior

Introduce codex-specific handling only if protocol/runtime differences force it.

### How should token expiry be handled for event delivery?

#### Re-authenticate automatically on 401

Attempt silent re-authentication and retry sending to avoid dropping telemetry during long-running loops.

#### Surface an error and stop sending events

Keep behavior explicit: log auth failures and disable event delivery until the user re-authenticates.

### What migration path should we use for existing `eventsUrl` users?

#### Add a deprecation period

Warn on `eventsUrl`/`DUST_EVENTS_URL` usage for one or more releases before removal.

#### Remove the setting immediately

Do a clean cut if current usage is low and migration complexity outweighs backward compatibility.


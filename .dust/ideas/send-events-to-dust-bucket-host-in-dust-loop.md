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

4. **Event delivery** is HTTP POST to `{DUST_BUCKET_HOST}/events` (or similar bucket service endpoint) with the token in the `Authorization: Bearer <token>` header. The existing `EventMessage` wire format is reused.

5. **Remove `DUST_EVENTS_URL` env var and `eventsUrl` settings** — the bucket service replaces this mechanism. This includes:
   - `settings.eventsUrl` field and `validateDustEventsUrl()` in `lib/config/settings.ts`
   - All three `DUST_EVENTS_URL` env var overrides in `loadSettings`
   - `PostEventFn` / `defaultPostEvent` / `createWireEventSender` in `lib/cli/commands/loop.ts` (replaced by bucket-aware sender)
   - References in the `dust-event-protocol.md` fact file and the `configuration-system.md` fact file

### Relevant code

- `lib/cli/commands/loop.ts` — `loopClaude()`, `createWireEventSender()`, `createDefaultDependencies()`; currently reads `settings.eventsUrl` to decide whether to send events
- `lib/config/settings.ts` — `eventsUrl` setting, `validateDustEventsUrl()`, `DUST_EVENTS_URL` overrides
- `lib/bucket/auth.ts` — `loadStoredToken()`, `storeToken()`, `authenticate()`, `getDustbucketHost()`
- `lib/cli/commands/bucket.ts` — `resolveToken()` — the token resolution pattern to reuse
- `lib/bucket/terminal-ui.ts` — existing hand-rolled ANSI terminal UI (tabs, key input, status dots); a simpler menu component would follow the same pattern (no external library)

### Goals alignment

- [Easy Adoption](../goals/easy-adoption.md) — removing the `eventsUrl` escape hatch reduces configuration surface; the prompt-on-first-run model is friendlier
- [Unsurprising UX](../goals/unsurprising-ux.md) — users running `dust loop` shouldn't need to know about `DUST_EVENTS_URL` to get events into the bucket
- [Progressive Disclosure](../goals/progressive-disclosure.md) — the menu only appears when a decision is needed; once configured it is silent
- [Minimal Dependencies](../goals/minimal-dependencies.md) — no new library; terminal menu uses raw ANSI codes

## Open Questions

### Should `dust loop` send events via HTTP POST or WebSocket?

#### Use HTTP POST

HTTP POST keeps delivery logic simple and aligns with the existing `defaultPostEvent` shape, but requires a defined bucket API endpoint.

#### Use WebSocket

WebSocket reuses the bucket transport model but adds connection lifecycle management to `dust loop`.

### Does `dustbucket.com` already expose an authenticated HTTP endpoint for events?

#### Endpoint already exists

If the endpoint already exists, confirm the exact URL and auth contract and wire `dust loop` directly to it.

#### Endpoint must be added server-side

If no endpoint exists today, add one and define the target URL format before changing `dust loop`.

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

### What HTTP path should the bucket host use for events?

#### Use `/events`

Short and direct endpoint that matches the single-purpose event ingest use case.

#### Use `/api/events` or `/agent/events`

More explicit namespacing that may fit existing server route conventions.

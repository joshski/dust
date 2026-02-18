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

1. **HTTP POST vs WebSocket for `dust loop`**: The bucket service currently receives events via WebSocket (used by `dust bucket`). Should `dust loop` also open a WebSocket, or should the bucket service expose a REST endpoint for HTTP POST? A long-lived WebSocket would require connection management in the loop; HTTP POST is simpler but may require a different server endpoint.

2. **Bucket service event endpoint**: Does `dustbucket.com` already expose an authenticated HTTP POST endpoint for events, or does this need to be added server-side? The current `defaultPostEvent` posts to an arbitrary URL; the new target URL format is not yet defined.

3. **Menu UX when stdin is not a TTY** (e.g. running in CI or as a background job): Should the loop skip the prompt and proceed without sending events, or treat a missing token as an error? The `CODEX_CI` / `DUST_UNATTENDED` env vars may be relevant.

4. **`dust loop codex` parity**: The description mentions both `claude` and `codex`. The `loopClaude` function handles both via `agentType`. The bucket integration should apply to both, but is there any codex-specific consideration?

5. **Token refresh / expiry**: The existing `authenticate()` flow issues a token but there is no refresh mechanism. Should `dust loop` silently re-authenticate on 401 responses, or surface an error and stop sending events?

6. **Migration path for existing `eventsUrl` users**: Removing `DUST_EVENTS_URL` is a breaking change for anyone already using it. Should there be a deprecation notice or a migration period, or is the audience small enough that a clean cut is fine?

7. **Event endpoint path on bucket host**: What is the HTTP path? Candidates: `/events`, `/api/events`, `/agent/events`. This needs to be agreed with the bucket service API.

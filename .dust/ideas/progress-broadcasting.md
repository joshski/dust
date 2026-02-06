# Progress Broadcasting

Stream dust events over websockets to a central server, giving humans real-time visibility into agent work without polling.

## Use cases

- Team dashboards showing all active agent work across repositories
- Slack/Discord notifications when tasks complete or fail
- Mobile alerts for important events (check failures, stuck agents)
- Analytics ingestion for velocity tracking

## Design

### Event types

- `task.started` - Agent began working on a task
- `task.completed` - Task finished successfully
- `check.passed` / `check.failed` - Quality gate results
- `commit.created` - Agent made a commit
- `loop.iteration` - Loop command completed an iteration
- `loop.idle` - No tasks available, agent sleeping

### Architecture

```
┌─────────────┐     websocket      ┌─────────────────┐
│  dust CLI   │ ─────────────────► │  Event Server   │
│  (agent)    │                    │  (self-hosted   │
└─────────────┘                    │   or managed)   │
                                   └────────┬────────┘
                                            │
                          ┌─────────────────┼─────────────────┐
                          ▼                 ▼                 ▼
                    ┌──────────┐      ┌───────────┐      ┌──────────┐
                    │  Slack   │      │ Dashboard │      │ Webhook  │
                    └──────────┘      └───────────┘      └──────────┘
```

## Relationship to Claim Server

This is complementary to the Claim Server idea. The claim server handles coordination (mutex), while broadcasting handles visibility (notifications). They could share infrastructure but serve different purposes.

## Privacy considerations

- Events should not include code content by default
- Repository name and task titles may be sensitive
- Token-based auth required for managed servers

## Open Questions

### Should the event server be self-hosted or offered as a managed service?

#### Self-hosted only

Users run their own event server (e.g. a simple Node process or Docker container). This keeps the project simple — dust ships the server code and users deploy it however they like. There are no privacy concerns since data never leaves the user's infrastructure. The downside is operational burden: users need to provision, secure, and maintain a running server, which is a significant barrier for individuals and small teams who just want a dashboard.

#### Managed service (SaaS)

Dust provides a hosted event server that users connect to with an API key. This is the lowest friction option — configure a token and events start flowing. However, it introduces a major scope expansion: dust becomes a service provider with uptime obligations, billing, data storage, and privacy compliance. It also creates a dependency on external infrastructure, which conflicts with the tool's philosophy of local-first, self-contained operation.

#### Self-hosted with an optional managed tier

Ship the server as open source for self-hosting, but also offer a managed version for teams that don't want to run infrastructure. This serves both audiences but doubles the maintenance surface and creates pressure to keep the self-hosted and managed versions in sync.

### What transport protocol should be used for event delivery?

#### WebSockets

Persistent bidirectional connection between the CLI and the event server. Low latency, well-suited for real-time dashboards, and supports backpressure. The downside is connection management — WebSocket connections can drop, need reconnection logic, and don't work well through certain proxies and firewalls. Also, the bidirectional capability is unnecessary since events only flow from CLI to server.

#### Server-Sent Events (SSE)

Unidirectional streaming from server to consumers (dashboards, bots). The CLI would POST events via HTTP and consumers would receive them via SSE. This is simpler than WebSockets for the read side, works through standard HTTP infrastructure, and degrades gracefully. However, the CLI still needs a way to push events, so this only solves half the problem — you'd pair it with plain HTTP POST from the CLI.

#### HTTP webhooks (push-based)

The CLI fires HTTP POST requests to configured endpoints for each event. No persistent connection needed, works through any network, and integrates directly with services like Slack and Discord without an intermediary server. The tradeoff is that there's no built-in buffering or ordering — if the endpoint is down, events are lost unless the CLI implements retry queues, which adds significant complexity.

### How much contextual data should events carry?

#### Minimal metadata only

Events include only structural data: event type, timestamp, repository name, task ID, and status. No code content, no diffs, no commit messages. This is the safest option for privacy and keeps event payloads small. Consumers that need more context (e.g. a dashboard showing what changed) would need to query the repository directly, which limits the usefulness of the event stream for remote consumers.

#### Rich metadata with opt-in content

Events include structural data by default, with optional fields like commit messages, task descriptions, and check output that users can enable via configuration. This gives teams control over the privacy/utility tradeoff. The complexity cost is a configuration surface that users need to understand, and the risk that a misconfigured agent leaks sensitive information to a shared server.

#### Full context including diffs

Events carry everything needed to understand the change without access to the repository: diffs, file lists, test output, and task descriptions. This makes dashboards and notifications maximally useful but creates significant privacy and security exposure. Event payloads become large, storage costs increase, and any breach of the event server exposes source code.

### Should event delivery be fire-and-forget or guaranteed?

#### Fire-and-forget

The CLI emits events on a best-effort basis. If the server is unreachable, events are dropped silently. This keeps the CLI simple and ensures that broadcasting never slows down or blocks the agent's actual work. The cost is that dashboards and analytics may have gaps, and critical events (like check failures) could be missed.

#### Guaranteed delivery with local buffering

The CLI writes events to a local queue and delivers them asynchronously with retries. If the server is down, events accumulate locally and are flushed when connectivity returns. This ensures completeness but adds disk I/O, state management, and the risk of unbounded queue growth if the server is unreachable for extended periods. It also means the CLI has a background process or thread managing delivery, which complicates the architecture.

#### Best-effort with a local event log

Events are always written to a local file (e.g. `.dust/events.log`) regardless of whether they're successfully broadcast. The local log serves as a fallback for debugging and analytics, while broadcasting remains fire-and-forget. This is a pragmatic middle ground — you get durability locally and low complexity for the network path — but the local log needs rotation and cleanup to avoid growing unboundedly

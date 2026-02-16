# Include more details in agent-session-started

Enrich the `agent-session-started` event with environmental context to aid diagnostics and improve session event formatting.

## Current State

The `agent-session-started` event (defined in `lib/agent-events.ts`) currently includes:
- `title`: Task name or description
- `prompt`: Full prompt sent to the agent
- `agentType`: Agent identifier (e.g., `'claude'`)
- `purpose`: Reason for the session (e.g., `'task'`, `'git-conflict'`)

This event is emitted by `runOneIteration` in `lib/cli/commands/loop.ts` and consumed by both the HTTP events endpoint (when `eventsUrl` is configured) and WebSocket connections from dustbucket.

## Proposed Additional Fields

Add environmental context that would be useful for:
1. **Diagnostics**: Understanding where and how agent sessions run
2. **Formatting**: Enabling richer session displays in UIs
3. **Correlation**: Grouping sessions by machine, repository, or environment

Candidate fields:
- `machineName`: Hostname identifying the machine running the agent
- `cwd`: Current working directory where the agent operates
- `os`: Operating system identifier (e.g., `'darwin'`, `'linux'`, `'win32'`)
- `osVersion`: OS version string for more precise environment identification
- `dustVersion`: Version of the dust CLI being used
- `nodeVersion`: Node/Bun runtime version

## Codebase Context

- The event type is defined in `lib/agent-events.ts:10-16`
- Events are created in `lib/cli/commands/loop.ts:264-270` and `lib/cli/commands/loop.ts:331-337`
- The wire format is documented in `.dust/facts/dust-event-protocol.md`
- Events flow through `createWireEventSender` for HTTP or `sendEvent` for WebSocket
- The `formatAgentEvent` function in `lib/agent-events.ts:49-52` formats events for console output

## Implementation Considerations

- Environment values can be obtained from Node.js APIs (`os.hostname()`, `os.platform()`, `os.release()`, `process.cwd()`, `process.version`)
- Changes to the event type require updating the TypeScript definition in `lib/agent-events.ts`
- The `.dust/facts/dust-event-protocol.md` documentation should be updated to reflect new fields
- Existing consumers of the event protocol need to handle new optional fields gracefully

## Open Questions

### Should all fields be required or optional?

#### All fields required

Every `agent-session-started` event includes all environmental fields. This ensures consistent data availability for all consumers. The downside is that it adds payload size and requires all event producers to gather this information.

#### New fields optional

Existing required fields (`title`, `prompt`, `agentType`, `purpose`) stay required; new environmental fields are optional. This allows gradual adoption and doesn't break existing producers, but consumers need to handle missing data.

### Should cwd expose full paths or relative paths?

#### Full absolute paths

Include the complete absolute path (e.g., `/Users/josh/projects/dust`). This gives maximum diagnostic information but may expose filesystem structure details and varies by machine.

#### Repository-relative paths

Show the path relative to the repository root, or just the repository name. This is more portable and privacy-conscious but provides less diagnostic value for debugging path-related issues.

### Should OS details be a single field or multiple?

#### Single combined field

A single `environment` or `platform` string combining OS name and version (e.g., `'darwin 24.1.0'`). Simpler to add and parse casually, but harder to filter or query by OS family.

#### Separate fields

Distinct `os` (platform family) and `osVersion` fields. More structured for querying and filtering, but adds more fields to the event payload.

### Should additional context be captured?

#### Just the proposed fields

Stick to machine name, cwd, os, and version info. Keeps the event focused on the most universally useful diagnostic information.

#### Include more runtime context

Also capture shell environment, available tools versions, git branch/commit, or other context that might aid debugging. This provides richer data but risks scope creep and larger payloads.

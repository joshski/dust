# Distinguish Bun runtime in agent-session-started

The `runtimeVersion` field in `agent-session-started` events always uses `process.version` (Node.js version). When dust runs under Bun, we should identify this and report the Bun version instead.

## Context

The `getEnvironmentContext` function in `lib/cli/commands/loop.ts:44-58` builds environment metadata for agent session events:

```typescript
function getEnvironmentContext(cwd: string): {
  machineName: string
  cwd: string
  platform: string
  dustVersion: string
  runtimeVersion: string
} {
  return {
    machineName: os.hostname(),
    cwd,
    platform: `${os.platform()} ${os.release()}`,
    dustVersion: DUST_VERSION,
    runtimeVersion: process.version,
  }
}
```

This data flows into `agent-session-started` events sent to `eventsUrl` via the dust event protocol (see `.dust/facts/dust-event-protocol.md`).

### Bun detection

Bun exposes its version via `Bun.version` (a string like `"1.3.8"`). The presence of the global `Bun` object indicates the runtime is Bun.

### Current usage

The `runtimeVersion` field appears in:
- `lib/agent-events.ts` - Type definition
- `lib/cli/commands/loop.ts` - `getEnvironmentContext` function
- `.dust/facts/dust-event-protocol.md` - Documentation and examples

## Proposed Change

Add a `runtime` field to `agent-session-started` events to explicitly identify the JavaScript runtime (`'node'` or `'bun'`), and update `runtimeVersion` to report the correct version for the detected runtime.

The updated event shape would be:

```typescript
{
  type: 'agent-session-started'
  title: string
  prompt: string
  agentType: string
  purpose: string
  machineName: string
  cwd: string
  platform: string
  dustVersion: string
  runtime: 'node' | 'bun'
  runtimeVersion: string
}
```

When running under Bun, `runtimeVersion` would be `Bun.version` (e.g., `"1.3.8"`). When running under Node.js, it would remain `process.version` (e.g., `"v22.0.0"`).

## Open Questions

### Should the runtime version format be normalized?

#### Keep format as-is from each runtime

Node.js versions have a `v` prefix (e.g., `v22.0.0`) while Bun versions do not (e.g., `1.3.8`).

Preserve the native format from each runtime. This is simpler and avoids transforming version strings. Consumers can distinguish by the `runtime` field.

#### Normalize to a consistent format

Strip the `v` prefix from Node.js versions so both runtimes use the same format (e.g., `22.0.0` and `1.3.8`). This makes version comparison easier but loses the native format.

### Should we support other runtimes?

#### Only support Node.js and Bun

Keep `runtime` as `'node' | 'bun'`. These are the two runtimes dust is known to work with.

#### Use a free-form string

Make `runtime` a free-form string (e.g., `'node'`, `'bun'`, `'deno'`) to allow future runtimes without schema changes. This is more flexible but less type-safe.

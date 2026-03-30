# Machine Identity in Connection Init

Add an optional `machineId` field to the `connection-init` message. This enables the server to track and distinguish multiple simultaneous connections from the same user.

## Motivation

Currently, all bucket worker connections from a user are indistinguishable to the server. When multiple machines connect simultaneously, the server cannot tell them apart, leading to unnecessary connection replacement (close code 4000) and preventing intelligent work distribution.

Adding machine identity enables:
- Multiple intentional connections per user without replacement conflicts
- Server-side work assignment rules based on machine characteristics
- Better debugging and observability (logs show which machine handled each session)
- Foundation for future features like machine-specific preferences or capability profiles

## Current Implementation

The `ConnectionInitMessage` (lib/bucket/server-messages.ts:49-55) contains:
```typescript
export interface ConnectionInitMessage {
  type: 'connection-init'
  dustVersion: string
  platform: string
  gitRemote?: string
  agents: AgentCapability[]
}
```

The builder function `buildConnectionInitPayload()` (lib/bucket/server-messages.ts:324-340) creates messages, and `defaultBuildConnectionInit()` (lib/bucket/native-io.ts:204-217) orchestrates discovery of version, platform, git remote, and agent capabilities in parallel.

## Proposed Changes

### 1. Extend ConnectionInitMessage

Add optional `machineId` field:
```typescript
export interface ConnectionInitMessage {
  type: 'connection-init'
  dustVersion: string
  platform: string
  gitRemote?: string
  agents: AgentCapability[]
  machineId?: string  // NEW: stable machine identifier
}
```

### 2. Machine ID Discovery

Add `getMachineId()` function in lib/bucket/native-io.ts following the pattern of `getDustVersion()`:

```typescript
/**
 * Get stable machine identifier.
 * Prompts user for name on first run, stores in ~/.dust/machine-id.
 * Falls back to system hostname if file doesn't exist yet.
 */
export async function getMachineId(io: IO): Promise<string>
```

Strategy:
- Check for `~/.dust/machine-id` file
- If exists, return stored value
- If not exists, call `os.hostname()` as temporary default
- On first `dust bucket worker` startup, prompt user to confirm/edit machine name
- Store user's choice in `~/.dust/machine-id` for future sessions

### 3. Startup Prompt in bucket-worker.ts

When `dust bucket worker` starts, before connecting:
1. Load or generate machine ID
2. If machine ID is just the hostname (not user-confirmed), show prompt:
   ```
   Machine name: josh-m1.local
   Press Enter to use this name, or type a custom name:
   ```
3. Store confirmed name in `~/.dust/machine-id`
4. Include in connection-init message

### 4. Close Code 4000 Behavior

Update connection replacement logic (lib/bucket/bucket-state.ts:525-577):
- Connections with same `machineId` replace each other (code 4000 prevents reconnect)
- Connections with different `machineId` coexist peacefully
- Connections without `machineId` use legacy behavior (latest replaces all)

This allows natural semantics:
- Restarting `dust bucket worker` on same machine → replaces old connection
- Running `dust bucket worker` on different machine → coexists with existing connections
- Backward compatible with clients not sending `machineId`

## Implementation Files

| File | Changes |
|------|---------|
| lib/bucket/server-messages.ts | Add `machineId?: string` to ConnectionInitMessage, update builder signature |
| lib/bucket/native-io.ts | Add `getMachineId(io)`, update `defaultBuildConnectionInit()` to include it |
| lib/cli/commands/bucket-worker.ts | Add startup prompt for machine name confirmation |
| lib/bucket/bucket-state.ts | Update close code 4000 logic to consider machineId |
| lib/bucket/server-messages.test.ts | Add tests for machineId in connection-init parsing |

## Related Ideas

- [Intelligent Work Distribution Across Machines](intelligent-work-distribution-across-machines.md) — Uses machine identity for assignment rules

## Related Facts

- [Bucket Protocol](../facts/bucket-protocol.md)

## Related Principles

- [Unsurprising UX](../principles/unsurprising-ux.md) — Machine identity should be intuitive
- [Easy Adoption](../principles/easy-adoption.md) — Should work out of the box with sensible defaults

## Open Questions

### Should machine ID be required or optional in the protocol?

#### Option: Optional (Recommended)

Keep `machineId` optional in `ConnectionInitMessage`. Older clients without the feature continue working with legacy behavior.

**Advantages:**
- Backward compatible
- Smooth migration path
- Clients can choose not to implement if unnecessary

**Disadvantages:**
- Server must handle mixed scenarios (some connections have ID, others don't)
- Legacy behavior (latest replaces all) remains in codebase

#### Option: Required

Make `machineId` required. All clients must send it or connection is rejected.

**Advantages:**
- Simpler server logic (no legacy cases)
- Forces adoption of better behavior

**Disadvantages:**
- Breaking change for existing clients
- Requires coordinated deployment

### What should the machine ID format be?

#### Option: User-Provided String (Recommended)

Prompt user for a friendly name like "macbook-pro" or "linux-workstation". Store in `~/.dust/machine-id`. No validation beyond non-empty string.

**Advantages:**
- Human-readable in logs and UI
- User controls identity
- Works across OS and network changes

**Disadvantages:**
- Users might pick duplicate names
- Requires input on first run

#### Option: System-Derived UUID

Generate UUID from system properties (hostname + MAC address + boot time). No user interaction.

**Advantages:**
- Automatic, zero config
- Guaranteed unique

**Disadvantages:**
- Changes if network config changes
- Opaque in logs ("connection from a3b4c5d6" tells user nothing)

#### Option: Hybrid

Default to hostname, allow override via `--machine-id` flag or config file. Store choice in `~/.dust/machine-id`.

**Advantages:**
- Works without interaction
- User can customize if needed

**Disadvantages:**
- Hostname collisions in large organizations
- Less discoverable than explicit prompt

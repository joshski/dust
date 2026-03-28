# Multiple Agent Machines Per User

Dust's bucket protocol supports foundational mechanics for users to split work across multiple physical agent machines with different capabilities. The server receives each machine's capabilities during connection handshake and can route repositories to specific agents via the `agentProvider` field. However, several design questions remain open about how work distribution should behave when multiple connections from the same user are active simultaneously.

## Current State

### What Already Works

The bucket protocol's `connection-init` handshake sends `AgentCapability[]` to the server, advertising which agent types ('claude' | 'codex') and models each client supports. The server can then assign repositories to specific agents via the `Repository.agentProvider` field in `repository-list` messages.

**Example capability advertisement:**
```typescript
interface ConnectionInitMessage {
  agents: [
    { agentType: 'claude', models: ['opus', 'sonnet', 'haiku'] },
    { agentType: 'codex', models: ['gpt-4o', 'gpt-4-turbo'] }
  ]
}
```

A single `dust bucket` client can already run mixed workloads (some repositories use Claude, others use Codex) by respecting the server's `agentProvider` assignment for each repository.

When multiple machines run `dust bucket` simultaneously for the same user, each establishes its own WebSocket connection and advertises its own capabilities. The protocol design naturally accommodates this: each connection is independent, repositories are assigned server-side, and clients don't coordinate directly with each other.

### What Requires Design Decisions

1. **Work Distribution Strategy**: When multiple capable machines are online, how should the server decide which machine handles which repository? Should it distribute work evenly, prefer faster machines, or respect explicit user preferences?

2. **Connection Replacement Behavior**: The protocol includes close code `4000` to signal "server replaced this connection with a newer one from the same user." Currently this prevents reconnection, but if multiple machines are *intentionally* running simultaneously, this behavior needs refinement.

3. **Capability Matching**: Should the server strictly match repository requirements to machine capabilities, or allow partial matching where a machine without a specific model falls back gracefully?

4. **Dynamic Rebalancing**: If a machine disconnects or a new machine connects, should the server immediately reassign in-progress repositories, or wait for current iterations to complete?

5. **Visibility and Control**: Should users explicitly register machines with distinct identities (e.g., "macbook-pro", "linux-workstation"), or remain anonymous with work distributed transparently?

## Related Facts

- [Bucket Protocol](../facts/bucket-protocol.md) — Connection handshake, `AgentCapability`, and close code 4000
- [Bucket Worker Container Modes](../facts/bucket-worker-container-modes.md) — How agents are invoked (Docker vs native)

## Related Principles

- [Agent Autonomy](../principles/agent-autonomy.md) — Agents should operate independently; multi-machine coordination should remain transparent
- [Unsurprising UX](../principles/unsurprising-ux.md) — Work distribution behavior should be guessable and intuitive

## Open Questions

### Should the server distribute work across multiple machines automatically, or require explicit user configuration?

#### Option: Automatic Distribution

The server detects multiple active connections from the same user and distributes repositories across them based on heuristics (round-robin, least-busy, capability matching). Users don't configure anything; they just run `dust bucket` on multiple machines and work spreads automatically.

**Advantages:**
- Zero configuration burden
- Agents can scale horizontally by adding machines
- Natural load balancing

**Disadvantages:**
- Unpredictable work placement (users don't know which machine handles which repo)
- Difficult to debug when one machine misbehaves
- May conflict with user's mental model of "this machine does X, that machine does Y"

#### Option: Explicit Machine Configuration

Users register machines with the server, assign labels or capabilities, and explicitly configure which repositories should run where. The server enforces these assignments.

**Advantages:**
- Predictable, intentional behavior
- Users can dedicate powerful machines to heavy workloads
- Clear debugging: "check the linux-workstation logs"

**Disadvantages:**
- Configuration overhead
- Less flexible (manual rebalancing when load changes)
- Requires UI for managing machine-to-repo mappings

#### Option: Hybrid with Connection Identity

Extend `connection-init` with an optional `machineId` field. Servers can track distinct machines, enable UI visibility, and allow optional per-machine routing rules while defaulting to automatic distribution.

**Advantages:**
- Flexibility: automatic by default, explicit when needed
- Debuggability: logs and UI can show which machine handled each session
- Smooth migration path: works without config, improves with config

**Disadvantages:**
- More complex protocol and server logic
- Risk of users not understanding when automatic vs explicit routing applies

### How should the close code 4000 behavior change to support multiple simultaneous connections?

#### Option: Remove Close Code 4000 Entirely

Currently, when a new connection from the same user arrives, the server closes the old connection with code `4000`, preventing reconnection. This makes sense for single-machine usage (replace stale connection), but breaks multi-machine scenarios. One approach is to remove this behavior entirely.

Allow any number of simultaneous connections per user. The server never forcibly closes connections; clients reconnect on network errors only.

**Advantages:**
- Simple, permissive
- No risk of accidentally kicking legitimate machines

**Disadvantages:**
- Orphaned connections accumulate (e.g., laptop lid closed without clean shutdown)
- No mechanism to "replace" a truly stale connection

#### Option: Make Close Code 4000 Opt-In Per Connection

Add a `replacePreviousConnections: boolean` field to `connection-init`. When `true`, the server closes other connections from the same user; when `false`, coexists peacefully. Default to `false` in multi-machine scenarios, `true` for single-machine setups.

**Advantages:**
- Explicit intent: users/clients declare their replacement semantics
- Backward compatible with existing single-machine behavior

**Disadvantages:**
- Clients must choose correctly (easy to get wrong)
- Ambiguous when some connections say "replace" and others say "coexist"

#### Option: Machine Identity Determines Replacement

If `connection-init` includes `machineId`, connections from the *same* `machineId` replace each other (code `4000`), but different `machineId` values coexist. Connections without `machineId` follow legacy behavior (latest wins).

**Advantages:**
- Natural semantics: reconnecting from same machine replaces old, connecting from new machine coexists
- No configuration needed; machine identity drives behavior

**Disadvantages:**
- Requires `machineId` to be stable (hostname? MAC address? user-provided label?)
- Edge case: same physical machine, different Docker containers (should they replace each other?)

### Should repository assignment changes interrupt in-progress work, or wait for clean iteration boundaries?

#### Option: Immediate Takeover

When the server reassigns a repository from one machine to another (due to machine disconnect, capability mismatch, or explicit user action), one approach is immediate takeover.

The server removes the repository from the old machine's `repository-list` and adds it to the new machine's list. The old machine stops its loop mid-iteration; the new machine starts fresh.

**Advantages:**
- Fast response to machine failures or user edits
- Simple protocol: just send new `repository-list` messages

**Disadvantages:**
- Wasted work: iterations in progress are discarded
- Potential for concurrent writes if both machines don't stop immediately
- Jarring UX: work disappears without explanation

#### Option: Graceful Handoff at Iteration Boundaries

The server waits for the old machine to finish its current iteration (signaled by `agent-session-ended` event), then removes the repository from that machine and adds it to the new machine.

**Advantages:**
- No wasted work: iterations complete
- Clean state: new machine picks up after a committed change
- Safer: no risk of concurrent git operations

**Disadvantages:**
- Slower response to machine failures (must wait for iteration timeout)
- Complex state tracking: server must remember "pending handoff" status
- What if the old machine hangs and never finishes?

#### Option: Immediate Notification with Local Grace Period

The server immediately sends updated `repository-list` messages to both machines, but the old machine finishes its iteration before stopping. If the new machine starts before the old finishes, the server queues work (both machines think they own the repo temporarily).

**Advantages:**
- Responsive: new machine can start immediately after old finishes
- Work preserved: old iteration completes
- Clear semantics: "you no longer own this after your current iteration"

**Disadvantages:**
- Transient ownership ambiguity: two machines temporarily assigned
- Requires server-side coordination (prevent double-execution)

### How should the server handle capability mismatches when assigning work?

#### Option: Strict Matching Only

Consider a scenario where a repository requires `agentProvider: 'codex'` but the only available machine supports Claude. One approach is strict matching.

The server only assigns repositories to machines that explicitly advertise the required capability. Incompatible repositories remain unassigned, visible in the UI as "waiting for capable agent."

**Advantages:**
- Predictable: users know unassigned means "no capable machine"
- No surprise failures from forced mismatches

**Disadvantages:**
- Inflexible: users must run machines with every possible capability
- Edge case: repository requires Codex, but Codex isn't actually necessary for the current task

#### Option: Best-Effort Fallback

If no exact match exists, assign to the "closest" machine (e.g., Claude machine for Codex repo with a warning). The agent may still succeed, or the user sees a clear error.

**Advantages:**
- Flexible: work proceeds even with imperfect setup
- Progressive disclosure: users learn about mismatches when they matter

**Disadvantages:**
- Confusing: "why is this Codex repo running on Claude?"
- Possible silent failures (agent proceeds, produces wrong result)

#### Option: Server Modifies agentProvider

If no capable machine is available, the server changes the repository's `agentProvider` to match available machines. Log the override in events.

**Advantages:**
- Maximizes utilization: work always runs if any machine is available
- Transparent: events show "overrode Codex requirement to Claude"

**Disadvantages:**
- Surprising: user configured Codex, server silently switches
- Risk of breaking assumptions (repository *requires* Codex for a reason)

### Should machines be assigned fixed capabilities at startup, or dynamically probed per repository?

#### Option: Static Capabilities

A machine advertises capabilities during `connection-init`. One approach is to make these static for the connection lifecycle.

Capabilities are probed once at `dust bucket` startup and sent in `connection-init`. They remain fixed for the entire WebSocket connection lifecycle. To update capabilities, disconnect and reconnect.

**Advantages:**
- Simple implementation: probe once, send once, done
- Predictable: server knows capabilities won't change mid-session

**Disadvantages:**
- Inflexible: users must restart `dust bucket` after installing new tools
- Misleading: if a tool becomes unavailable (e.g., license expires), server doesn't know

#### Option: Dynamic Re-Probing

Before starting each repository iteration, the bucket worker re-probes capabilities and sends a `capability-update` message if they've changed. The server uses the latest capabilities for routing decisions.

**Advantages:**
- Adaptive: environments evolve naturally
- Resilient: tool installations take effect immediately

**Disadvantages:**
- More complex protocol (new message type)
- Ambiguous: what if capabilities change mid-iteration?
- Potential for flapping (tool available/unavailable repeatedly)

#### Option: Explicit Refresh Command

Capabilities are static, but `dust bucket refresh-capabilities` (or similar) triggers re-probing and sends an updated `connection-init`. Users control when changes propagate.

**Advantages:**
- Explicit, predictable
- No protocol changes (reuses existing handshake)

**Disadvantages:**
- Users must remember to refresh (easy to forget)
- Requires CLI command or UI button

# Intelligent Work Distribution Across Machines

Enable the dustbucket server to intelligently distribute repository assignments across multiple connected machines. Distribution considers capabilities, load, and optional user preferences.

## Motivation

With multiple bucket worker machines connected per user, the server needs a strategy for deciding which machine handles which repository. The current protocol supports assignment via `repository-list` messages, but lacks distribution logic.

Goals:
- Balance work across available machines
- Respect capability constraints (don't assign Codex repos to Claude-only machines)
- Allow optional explicit assignment rules
- Minimize disruption when machine availability changes

## Current State

The server sends `repository-list` or `connection-ready` messages containing repositories with optional `agentProvider` field (lib/bucket/repository.ts:62-70). Clients already handle repository reconciliation (lib/bucket/repository.ts:262-278), detecting additions, removals, and `agentProvider` changes.

What's missing: server-side logic to decide **which repositories go to which connection**.

## Proposed Strategy: Capability-Aware Round-Robin

Default behavior when multiple machines connect:

1. **Partition by Capability**: Group repositories by required `agentProvider` ('claude', 'codex', or unspecified)
2. **Match to Machines**: For each group, filter to machines advertising that capability
3. **Round-Robin Within Groups**: Distribute repositories evenly across matched machines
4. **Fallback**: If no machine matches a required capability, mark repository as "waiting for capable agent" in UI

### Example Scenario

User has:
- Machine A: Claude (opus, sonnet, haiku)
- Machine B: Codex (gpt-4o, gpt-4-turbo)
- Machine C: Both Claude and Codex

Repositories:
- Repo 1: agentProvider = 'claude'
- Repo 2: agentProvider = 'codex'
- Repo 3: agentProvider = 'claude'
- Repo 4: no agentProvider specified

Distribution:
- Repo 1 → Machine A (claude, round-robin first)
- Repo 2 → Machine B (codex, only option)
- Repo 3 → Machine C (claude, round-robin second)
- Repo 4 → Machine A (no preference, round-robin continues)

## Optional Explicit Rules

Users can configure per-machine or per-repository rules in the server UI:

**Machine Affinity**: "Always assign `dustbucket/api` to machine C"
**Machine Exclusion**: "Never assign `acme/frontend` to machine B"
**Priority Machines**: "Prefer machine C over others for all repos"

These rules override default round-robin behavior. Server-side only—no client changes needed.

## Rebalancing Behavior

### When a New Machine Connects

- Server recalculates distribution including new machine
- Sends updated `repository-list` to all affected connections
- Old machines receive removal messages for repos being reassigned
- New machine receives addition messages for newly assigned repos

### When a Machine Disconnects

- Server recalculates distribution excluding disconnected machine
- Redistributes orphaned repositories to remaining machines
- Affected machines receive addition messages

### Iteration Boundaries

Repository assignment changes take effect at iteration boundaries:
- Machine currently running an iteration completes it
- Next iteration picks up from the new assignment
- No mid-iteration takeover (prevents git conflicts and wasted work)

Mechanism: When client receives `repository-list` with a removal, it waits for `agent-session-ended` before stopping the repository loop. New machine waits to start until handoff complete (server coordinates via events).

## Implementation Files

Server-side implementation (not in this repository):
- Connection manager: tracks active connections per user with machineId
- Repository assignment engine: runs capability-aware round-robin algorithm
- Event handlers: trigger rebalancing on connect/disconnect

Client-side (this repository):
- No changes required beyond machine identity support
- Existing reconciliation logic handles assignment changes

## Related Tasks

(none)

## Related Facts

- [Bucket Protocol](../facts/bucket-protocol.md)
- [Bucket Tool Execution](../facts/bucket-tool-execution.md)

## Related Principles

- [Agent Autonomy](../principles/agent-autonomy.md) — Work distribution should be transparent to agents
- [Unsurprising UX](../principles/unsurprising-ux.md) — Distribution behavior should be guessable

## Open Questions

### Should rebalancing happen immediately or wait for natural load changes?

#### Option: Immediate Rebalancing (Recommended)

When a new machine connects or disconnects, server immediately recalculates distribution and sends updated repository lists. Balances load as quickly as possible.

**Advantages:**
- Fastest response to topology changes
- Most even load distribution
- Predictable behavior

**Disadvantages:**
- Frequent churn if machines connect/disconnect rapidly
- May reassign work unnecessarily (new machine could just pick up new repos)

#### Option: Lazy Rebalancing

Don't reassign existing work when machines connect. Only assign new repositories or repositories orphaned by disconnections.

**Advantages:**
- Minimal disruption
- Simpler server logic
- No risk of fighting over repositories

**Disadvantages:**
- Uneven load (early machines get heavy workload, later machines idle)
- Doesn't utilize new capacity efficiently

#### Option: Threshold-Based Rebalancing

Rebalance only when load imbalance exceeds threshold (e.g., one machine has 3+ more repos than another).

**Advantages:**
- Balances load over time
- Avoids unnecessary churn

**Disadvantages:**
- More complex logic
- Harder to predict behavior

### How should capability mismatches be handled?

#### Option: Strict Matching Only (Recommended)

Server only assigns repositories to machines advertising the required `agentProvider`. Incompatible repositories remain unassigned, visible in UI as "waiting for capable agent."

**Advantages:**
- Predictable: unassigned = no capable machine
- No surprise failures
- Clear user feedback

**Disadvantages:**
- Requires user to run machines with all needed capabilities
- Less flexible

#### Option: Best-Effort Fallback

If no exact match exists, assign to "closest" machine (e.g., Claude machine for Codex repo) with warning in logs and UI.

**Advantages:**
- Work proceeds even with imperfect setup
- More forgiving

**Disadvantages:**
- Confusing: "why is Codex repo running on Claude?"
- Risk of silent failures

### Should load balancing consider machine performance characteristics?

#### Option: Equal Distribution (Recommended)

Distribute repositories evenly across machines regardless of hardware specs. Simple round-robin.

**Advantages:**
- Simple implementation
- Predictable
- No need for performance metrics

**Disadvantages:**
- Slow machines get same load as fast machines
- Suboptimal utilization

#### Option: Weighted Distribution

Allow machines to advertise "capacity" (e.g., number of parallel sessions supported). Distribute proportionally.

**Advantages:**
- Better utilization of faster hardware
- Natural load balancing

**Disadvantages:**
- Complex: how to measure capacity?
- Requires protocol extension (ConnectionInitMessage.capacity)
- Users must configure capacity correctly

# Claim Server

A "claim server" which can be self-hosted or a managed service, acting as both a mutex for tasks and a tracker for work in progress.

## Problem

When multiple agents run `dust loop claude` against the same repository (or clones of it), nothing prevents two agents from picking the same task. The `dust next` command lists unblocked tasks based on local file state, but it has no awareness of what other agents are doing. This leads to duplicated work, merge conflicts, and wasted compute.

Git alone can't solve this. By the time an agent commits and pushes, it may have spent significant time on work another agent already completed. The conflict is discovered too late.

## Use cases

- Prevent multiple agents from working on the same task simultaneously
- Track which tasks are currently being worked on across distributed agents
- Provide visibility into work-in-progress across a team or organization
- Release claims when agents crash or time out, so tasks don't get stuck

## How it works

1. Before starting a task, the agent calls the claim server: `POST /claims { task: "task-slug", agent: "agent-id" }`
2. The server either grants the claim (200) or rejects it (409 Conflict) if another agent holds it
3. The agent works on the task while periodically sending heartbeats: `PUT /claims/task-slug/heartbeat`
4. On completion, the agent releases the claim: `DELETE /claims/task-slug`
5. If heartbeats stop (agent crashed), the server automatically expires the claim after a configurable TTL

The `dust next` command would optionally query the claim server to filter out already-claimed tasks, so agents only see genuinely available work.

## Integration with dust

- A new setting in `.dust/config/settings.json`: `"claimServer": { "url": "http://localhost:3847" }`
- `dust next` filters out claimed tasks when a claim server is configured
- `dust pick task` claims the selected task before the agent begins
- `dust loop claude` claims and releases tasks as part of each iteration
- When no claim server is configured, behavior is unchanged (single-agent mode)

## Relationship to Progress Broadcasting

The claim server and the event broadcasting system serve different purposes but could share infrastructure. The claim server is a coordination primitive (mutex + liveness), while broadcasting is an observability primitive (notifications + dashboards). A combined server could expose both capabilities, but they should remain logically separate so teams can adopt one without the other.

## Open Questions

### What happens when a claimed task is deleted from the filesystem by another agent?

#### Claim server is authoritative

The claim server tracks task state independently. If an agent deletes a task file (marking it complete), the claim is released, but the server retains a record that the task was completed. Other agents querying `dust next` see the task as gone from the filesystem and released on the server — no conflict. This is simple but assumes the filesystem and server stay roughly in sync. If an agent deletes the file without releasing the claim (crash mid-commit), the TTL expiry handles cleanup.

#### Filesystem is authoritative, claim server is advisory

The claim server is purely a coordination hint. `dust next` checks the filesystem first (does the task file exist?) and only then checks the claim server (is it claimed?). If the file is gone, the task doesn't appear regardless of claim state. This makes the claim server a soft layer that degrades gracefully — if the server goes down, agents fall back to single-agent behavior with possible collisions. The risk is that agents checking at slightly different times see inconsistent state during the window between file deletion and git push.

### How should claims survive agent restarts?

#### Heartbeat-based TTL only

Claims expire automatically if heartbeats stop. When an agent restarts, it must re-claim the task. If another agent claimed it in the gap, the restarting agent picks a different task. This is simple and stateless from the agent's perspective. The downside is that brief network interruptions or agent restarts cause unnecessary claim loss, even if the agent is still working on the task. A generous TTL (e.g. 5 minutes) mitigates this but delays recovery when an agent truly crashes.

#### Persistent claim with agent identity

Each agent has a stable identity (e.g. derived from hostname + working directory). Claims are tied to this identity rather than a session. When an agent restarts, it can reclaim tasks it previously held by proving its identity. This avoids losing claims during restarts but requires the agent to persist its identity somewhere, and the claim server needs logic to distinguish "same agent restarting" from "different agent impersonating."

#### Lease-based with explicit renewal

Claims are granted as time-limited leases (e.g. 30 minutes). The agent must explicitly renew the lease before it expires. This is similar to heartbeats but with coarser granularity and explicit renewal rather than passive keep-alive. It maps well to cloud environments where leases are a standard primitive. The downside is that lease duration becomes a tuning parameter — too short and agents lose claims during long tasks, too long and crashed agents block tasks.

### Should the claim server be a standalone process or embedded in a git hook?

#### Standalone HTTP server

A separate process (Node, Docker container, or cloud function) that agents communicate with over HTTP. This is the most flexible option — multiple repos can share a server, it's deployable to any infrastructure, and it has clear API boundaries. The cost is operational overhead: someone has to run and maintain the server.

#### Git-based locking using branch conventions

Instead of a separate server, use git branches as claims: creating `dust/claim/task-slug` branch means "I'm working on this." Agents check for claim branches before picking tasks. This requires no extra infrastructure — git is the coordination layer. But git branch operations are slow, subject to race conditions (two agents creating the branch simultaneously), and don't support TTL or heartbeats. Crashed agents leave stale claim branches forever unless cleaned up manually.

#### Lockfile in a shared filesystem

A shared directory (NFS, S3, or a shared git repo) where agents create lockfiles. Simple and requires no server process, but depends on filesystem atomicity guarantees that vary by backend. S3 has eventual consistency issues. NFS has stale lock problems. This works for small teams with shared infrastructure but doesn't scale or travel well.

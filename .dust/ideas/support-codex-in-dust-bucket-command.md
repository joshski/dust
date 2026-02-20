# Support codex in `dust bucket` command

Allow `dust bucket` to use different AI agents (Claude Code, Codex) for running repository loops. The bucket service would determine which agent to use.

## Context

Currently, `dust bucket` is hardcoded to use Claude Code (`lib/claude/run.ts`) for all repository loops. The code path:

1. `bucket.ts` calls `toRepositoryDependencies()` which sets `run: claudeRun`
2. `repository.ts` passes this through to `repository-loop.ts`
3. `repository-loop.ts` wraps the `run` function and passes it to `runOneIteration()` in `loop.ts`

Meanwhile, `dust loop` already supports multiple agents:
- `dust loop claude` uses `lib/claude/run.ts`
- `dust loop codex` uses `lib/codex/run.ts` via `loop-codex.ts`

The agent-switching in `loop-codex.ts` is straightforward: it swaps `run: codexRun as LoopDependencies['run']` and sets `agentType: 'codex'`.

The agent detection module (`lib/agents/detection.ts`) identifies which agent environment is running based on environment variables:
- `CLAUDECODE` + `CLAUDE_CODE_REMOTE` → Claude Code Web
- `CLAUDECODE` → Claude Code
- `CODEX_HOME` or `CODEX_CI` → Codex
- Fallback → unknown

The Repository type (`lib/bucket/repository.ts`) already has an optional `id` field sent from the server:
```typescript
interface Repository {
  name: string
  gitUrl: string
  url?: string
  id?: string
}
```

### Principles alignment

- [Agent-Agnostic Design](../principles/agent-agnostic-design.md) — Dust should work with multiple agents; the choice should be made at runtime
- [Agent-Specific Enhancement](../principles/agent-specific-enhancement.md) — Dust can optimize for specific agents while remaining agnostic at core

### Related ideas

- [Send events to dust bucket host in `dust loop`](send-events-to-dust-bucket-host-in-dust-loop.md) — Also deals with agent/bucket integration
- [Multiple loops per repo](multiple-loops-per-repo.md) — Could interact with agent selection if different loops use different agents

## Open Questions

### Where should the agent choice be determined?

#### Server-side (bucket service decides)

The bucket service (`dustbucket.com`) sends the agent type along with repository data in the `repository-list` message. The server has full context about:
- User preferences and configuration
- Repository-specific settings
- Available agent credits/quotas
- Task characteristics that might favor one agent

This keeps agent selection logic centralized and allows the bucket service to implement policies like "use Codex for this org" or "use Claude for implementation, Codex for research."

#### Client-side (dust bucket command decides)

The `dust bucket` client detects available agents locally (e.g., which CLIs are installed) and selects based on configuration. This gives users direct control but fragments the logic.

#### Per-repository configuration in the bucket service

Each repository in the bucket service has an `agentType` setting. Users configure it through the web UI. Simpler than dynamic selection but less flexible.

### What protocol changes are needed for agent specification?

#### Extend the repository-list message

Add an `agentType` field to the repository payload:
```typescript
interface RepositoryData {
  name: string
  gitUrl: string
  url?: string
  id?: string
  hasTask?: boolean
  agentType?: 'claude' | 'codex'  // New field
}
```

The client respects this when creating loop dependencies. Default to `'claude'` if not specified for backward compatibility.

#### Use a separate agent-config message

The server sends a dedicated message type for agent configuration, separate from repository data. More complex but allows dynamic agent changes without resending the full repository list.

### How should the agent runner be selected at runtime?

#### Dependency injection at loop start

When `startRepositoryLoop()` is called, the agent type is known from the repository data. Create `LoopDependencies` with either `claudeRun` or `codexRun`:

```typescript
const run = agentType === 'codex' ? codexRun : claudeRun
const loopDeps: LoopDependencies = { ...baseDeps, run, agentType }
```

This mirrors how `loop-codex.ts` currently works.

#### Factory function for run instances

Create a factory that returns the appropriate runner:
```typescript
function createAgentRunner(agentType: 'claude' | 'codex'): typeof claudeRun {
  return agentType === 'codex' ? codexRun : claudeRun
}
```

This abstracts the selection logic for reuse.

### Should agent type be changeable during a session?

#### Fixed at repository add time

When a repository is added to the manager, its agent type is set and doesn't change. Simple to implement; the loop uses the same agent throughout.

#### Dynamically changeable via message

The server can send a message to change the agent type for a repository. The loop would need to finish its current iteration, then pick up the new agent. More complex but allows real-time adjustments.

### What happens if the requested agent is not available locally?

#### Fail fast with clear error

If `dust bucket` is asked to use Codex but Codex CLI isn't installed, fail with an error message explaining how to install it. This matches the current behavior where Claude Code must be available.

#### Fall back to available agent

If the requested agent isn't available, fall back to an available one and log a warning. More resilient but may surprise users expecting a specific agent.

#### Report unavailable agent to server

Send a message back to the bucket service indicating which agents are available locally. The server can then assign work only to compatible clients.

### How should events identify which agent produced them?

#### Use existing agentType field in events

The `AgentSessionEvent` already has an `agentType` field (set via `loopDependencies.agentType`). Continue using this pattern—no protocol changes needed.

#### Add agent metadata to EventMessage

Extend `EventMessage` with explicit agent identification:
```typescript
interface EventMessage {
  // existing fields...
  agentType?: 'claude' | 'codex'
  agentVersion?: string
}
```

This provides more context for debugging and analytics.

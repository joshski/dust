# Track agent status in RepositoryState

Add an `agentStatus` field to `RepositoryState` in `lib/bucket/repository.ts` and update it when agent session events arrive.

## Change Details

In `lib/bucket/repository.ts`:

1. Add `agentStatus: 'idle' | 'busy'` to the `RepositoryState` interface, defaulting to `'idle'`.
2. In `runRepositoryLoop()`, within the `onAgentEvent` callback:
   - Set `repoState.agentStatus = 'busy'` when the event type is `'agent-session-started'`.
   - Set `repoState.agentStatus = 'idle'` when the event type is `'agent-session-ended'`.
3. Add tests verifying status transitions on agent events.

## Goals

- [Decoupled Code](../goals/decoupled-code.md)

## Blocked By

(none)

## Definition of Done

- [ ] `RepositoryState` has an `agentStatus` field typed `'idle' | 'busy'`
- [ ] Status is set to `'busy'` on `agent-session-started`
- [ ] Status is set to `'idle'` on `agent-session-ended`
- [ ] Tests cover both transitions
- [ ] `bin/dust check` passes

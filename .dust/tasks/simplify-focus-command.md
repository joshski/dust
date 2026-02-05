# Simplify Focus Command

Remove the event posting logic from `dust focus`. Consumers can parse the bash command from raw events.

## Goals

- [Human-AI Collaboration](../goals/human-ai-collaboration.md)

## Blocked By

(none)

## Definition of Done

- [ ] Remove `AgentFocusEvent` type from `lib/cli/commands/loop.ts`
- [ ] Remove `agent.focus` from `DustWireEvent` union
- [ ] Remove `agent.focus` case from `formatEvent()`
- [ ] Revert `createEventPoster` to return a simple emit function (remove `EventPosterWithSession` interface and session management methods)
- [ ] Remove `buildClaudeEnv` function and revert to just `{ DUST_UNATTENDED: '1' }`
- [ ] Remove `sessionId`, `agentSessionId`, `eventsUrl` from `IterationOptions`
- [ ] Simplify `focus.ts` to just parse arguments and output confirmation (no env var reading, no event posting)
- [ ] Remove `agent.focus` documentation from `.dust/facts/dust-event-protocol.md`
- [ ] Update tests to reflect simplified behavior
- [ ] All tests pass (`bun test`)

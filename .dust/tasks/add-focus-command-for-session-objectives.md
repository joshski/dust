# Add Focus Command for Session Objectives

Add a `dust focus` command for agents to declare their current objective. When running in `dust loop`, this emits an event for remote interfaces to track progress with meaningful session names.

## Goals

- [Human-AI Collaboration](../goals/human-ai-collaboration.md)
- [Agent Autonomy](../goals/agent-autonomy.md)

## Blocked By

(none)

## Definition of Done

- [ ] `AgentFocusEvent` type added to `lib/cli/commands/loop.ts` with `type: 'agent.focus'` and `objective: string`
- [ ] `formatEvent()` handles `agent.focus` and returns `🎯 Focus: ${event.objective}`
- [ ] Loop passes `DUST_SESSION_ID`, `DUST_AGENT_SESSION_ID`, and `DUST_EVENTS_URL` environment variables to Claude invocations
- [ ] `agentSessionId` generation refactored to occur before `claude.started` event so it can be passed via env var
- [ ] New `lib/cli/commands/focus.ts` command implemented:
  - Parses objective from arguments
  - Reads session context from environment variables
  - POSTs event to eventsUrl if in session context
  - Outputs confirmation message with note if not in a loop session
- [ ] Command registered in `lib/cli/main.ts` as `focus`
- [ ] Help text updated in `lib/templates/help.txt`
- [ ] Event protocol documented in `.dust/facts/dust-event-protocol.md`
- [ ] Tests added for focus command in `lib/cli/commands/focus.test.ts`
- [ ] Tests updated in `lib/cli/commands/loop.test.ts` for env var passing
- [ ] All tests pass (`bun test`)

## Implementation Notes

### Command Usage

```bash
dust focus "add login box"
```

Response:
```
🎯 Focus: add login box
```

(If not in a loop session, adds: `(Note: Not in a loop session, no event posted)`)

### Event Wire Format

```json
{
  "sequence": 42,
  "timestamp": "2025-01-15T10:35:00.000Z",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "agentSessionId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "agentType": "claude",
  "event": { "type": "agent.focus", "objective": "add login box" }
}
```

### Files to Modify

| File | Change |
|------|--------|
| `lib/cli/commands/loop.ts` | Add event type, refactor agentSessionId, pass env vars |
| `lib/cli/commands/focus.ts` | NEW - Focus command |
| `lib/cli/main.ts` | Register focus command |
| `lib/templates/help.txt` | Add help entry |
| `.dust/facts/dust-event-protocol.md` | Document agent.focus event |
| `lib/cli/commands/focus.test.ts` | NEW - Tests |
| `lib/cli/commands/loop.test.ts` | Test env var passing |

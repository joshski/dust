# Restrict task-only commit blocking to Claude Code Web

Currently the pre-push hook in `lib/cli/commands/pre-push.ts` blocks all Claude Code sessions from pushing task-only commits (commits that only add task files and optionally delete idea files). The warning message is:

```
⚠️  Task-only commit detected! You added a task but did not implement it.
```

This behavior should only apply to Claude Code Web sessions, not regular Claude Code CLI sessions.

## Implementation

### Step 1: Create type-safe agent detection module

Move `detectAgent` from `lib/cli/commands/agent-shared.ts` to a new file `lib/agents/detection.ts` with a type-safe return value:

```typescript
export type Agent =
  | { type: 'claude-code-web'; name: 'Claude Code Web' }
  | { type: 'claude-code'; name: 'Claude Code' }
  | { type: 'codex'; name: 'Codex' }
  | { type: 'unknown'; name: 'Agent' }

export type AgentType = Agent['type']

export function detectAgent(env: NodeJS.ProcessEnv = process.env): Agent
```

Move the detection tests from `lib/cli/commands/agent-shared.test.ts` to `lib/agents/detection.test.ts`.

### Step 2: Update agent-shared.ts

Update `lib/cli/commands/agent-shared.ts` to import from the new location:

```typescript
import { detectAgent } from '../../agents/detection'
```

The `templateVariables` function should use `agent.name` for the display name and `agent.type === 'claude-code-web'` for the boolean check.

### Step 3: Update pre-push hook

In `lib/cli/commands/pre-push.ts`, import and use the detection:

```typescript
import { detectAgent } from '../../agents/detection'

// In prePush function, around line 198:
const agent = detectAgent()

if (analysis.isTaskOnly && agent.type === 'claude-code-web') {
  // ... existing blocking logic
}
```

## Files to modify

- `lib/agents/detection.ts` - New file with type-safe detection
- `lib/agents/detection.test.ts` - New file with moved tests
- `lib/cli/commands/agent-shared.ts` - Update to use new module
- `lib/cli/commands/agent-shared.test.ts` - Remove detection tests (keep templateVariables tests)
- `lib/cli/commands/pre-push.ts` - Add agent detection check
- `lib/cli/commands/pre-push.test.ts` - Add tests for the new behavior

## Goals

- [Agent-Specific Enhancement](../goals/agent-specific-enhancement.md)

## Blocked by

(none)

## Definition of done

- [ ] `detectAgent` moved to `lib/agents/detection.ts` with type-safe `Agent` return type
- [ ] `agent-shared.ts` updated to import from new location
- [ ] Pre-push hook allows task-only commits when `agent.type` is `'claude-code'`
- [ ] Pre-push hook blocks task-only commits when `agent.type` is `'claude-code-web'`
- [ ] All tests pass

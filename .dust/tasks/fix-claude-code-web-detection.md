# Fix Claude Code Web detection

Use `CLAUDE_CODE_REMOTE=true` instead of `CLAUDE_CODE_ENTRYPOINT === 'remote'` to detect Claude Code Web sessions. The entrypoint value varies by launch context (e.g. `remote_desktop` from the desktop app, `remote` from the web app, potentially others from iOS or future clients). The current check misses `remote_desktop`, so Claude Code Web sessions launched from the desktop app are misidentified as plain `claude-code`.

## Fix

Use `CLAUDE_CODE_REMOTE=true` instead of checking the entrypoint value. This is a stable boolean signal that's present in all remote sessions regardless of how they were launched.

In `lib/agents/detection.ts`, change:

```typescript
if (env.CLAUDE_CODE_ENTRYPOINT === 'remote') {
```

to:

```typescript
if (env.CLAUDE_CODE_REMOTE === 'true') {
```

### Files to change

- **`lib/agents/detection.ts`** — Replace the `CLAUDE_CODE_ENTRYPOINT === 'remote'` check with `CLAUDE_CODE_REMOTE === 'true'`. Update the doc comment to reflect the new detection strategy.
- **`lib/agents/detection.test.ts`** — Update existing tests to use `CLAUDE_CODE_REMOTE: 'true'` instead of `CLAUDE_CODE_ENTRYPOINT: 'remote'`. Add a test that `CLAUDE_CODE_ENTRYPOINT: 'remote_desktop'` with `CLAUDE_CODE_REMOTE: 'true'` detects as `claude-code-web`. Add a test that `CLAUDECODE: '1'` with `CLAUDE_CODE_ENTRYPOINT: 'remote_desktop'` but without `CLAUDE_CODE_REMOTE` detects as plain `claude-code`.

## Goals

- [Agent-Specific Enhancement](../goals/agent-specific-enhancement.md)
- [Actionable Errors](../goals/actionable-errors.md)

## Blocked By

(none)

## Definition of Done

- [ ] `detectAgent()` uses `CLAUDE_CODE_REMOTE === 'true'` for web detection
- [ ] `CLAUDE_CODE_ENTRYPOINT` is no longer used for agent type detection
- [ ] Tests cover `remote`, `remote_desktop`, and missing entrypoint scenarios with `CLAUDE_CODE_REMOTE=true`
- [ ] Existing tests updated and passing

# Log Malformed JSON in Agent Spawn

Add debug logging when agent processes emit lines that fail JSON parsing, making protocol errors visible for debugging.

## Context

Both `spawn-claude-code.ts` and `spawn-codex.ts` silently skip lines that fail JSON parsing. When an agent emits malformed output (truncated JSON, protocol errors, unexpected text), these failures are invisible. Logging helps diagnose agent communication issues.

## Locations to Fix

1. **`lib/claude/spawn-claude-code.ts:112`**
   ```typescript
   try {
     yield JSON.parse(line) as RawEvent
   } catch {
     // Skip malformed JSON lines
   }
   ```

2. **`lib/codex/spawn-codex.ts:76`** - Same pattern

## Proposed Fix

Log the malformed line at debug level before skipping:

```typescript
try {
  yield JSON.parse(line) as RawEvent
} catch {
  debug('Skipping malformed JSON line: %s', line.slice(0, 200))
}
```

Use truncation to avoid flooding logs with large malformed payloads.

## Principles

- [Debugging Tooling](../principles/debugging-tooling.md) - agents need readable error output
- [Actionable Errors](../principles/actionable-errors.md) - error messages should help diagnose issues

## Blocked By

(none)

## Definition of Done

- [ ] Both spawn functions log malformed JSON lines at debug level
- [ ] Log output is truncated to prevent log flooding
- [ ] `bin/dust check` passes

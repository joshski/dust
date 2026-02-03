# Handle git pull failures in loop

When `git pull` fails during `dust loop claude`, spawn a Claude session to resolve it instead of silently continuing.

## Current behavior

In `lib/cli/commands/loop.ts`, when `gitPull()` fails, the loop just logs a note and continues:

```typescript
if (!pullResult.success) {
  context.stdout(`Note: git pull skipped (${pullResult.message})`)
}
```

This causes problems when there are unpushed local commits that conflict with remote changes (a race condition between agents or between an agent and a human).

## Desired behavior

1. `git pull` fails
2. Spawn a Claude session with context explaining the failure
3. Let Claude reason about how to resolve it (rebase, resolve conflicts, run checks, etc.)
4. Continue the loop after Claude completes

## Implementation notes

- Pass the error message to Claude so it understands what went wrong
- Claude should be instructed to resolve the issue and push changes
- Consider using a specific prompt template for this scenario

## Goals

- [Make Software Development Joyful](../goals/make-software-development-joyful.md)

## Blocked by

(none)

## Definition of done

- [ ] When `git pull` fails in the loop, a Claude session is spawned to resolve the issue
- [ ] Claude receives the error message and is instructed to resolve and push
- [ ] Tests cover the git pull failure scenario
- [ ] `.dust/facts/loop-command.md` is updated to document this behavior

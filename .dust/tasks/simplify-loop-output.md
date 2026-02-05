# Simplify Loop Output

Improve the console output from `dust loop claude` to be more readable by reducing noise and improving visual separation between iterations.

## Current Output

```
🔄 Syncing with remote...
🔍 Checking for available tasks...
💤 No tasks available. Sleeping...
🔄 Syncing with remote...
🔍 Checking for available tasks...
💤 No tasks available. Sleeping...
```

## Desired Output

```
🌍 Syncing with remote
😴 No tasks available. Sleeping...

🌍 Syncing with remote
😴 No tasks available. Sleeping...

```

## Changes Required

In `lib/cli/commands/loop.ts`, modify the `formatEvent` function:

1. **`loop.syncing`** (line 106): Change from `'🔄 Syncing with remote...'` to `'🌍 Syncing with remote'`
2. **`loop.checking_tasks`** (line 110): Return `null` instead of a message (suppress this output)
3. **`loop.no_tasks`** (line 112): Change from `'💤 No tasks available. Sleeping...'` to `'😴 No tasks available. Sleeping...\n'` (note the trailing newline for visual separation)

Update the corresponding tests in `lib/cli/commands/loop.test.ts` to match the new output format.

## Goals

- [Progressive Disclosure](../goals/progressive-disclosure.md)

## Blocked By

(none)

## Definition of Done

- [ ] `formatEvent` returns updated messages as specified
- [ ] `formatEvent` returns `null` for `loop.checking_tasks`
- [ ] Blank line appears between sleep iterations
- [ ] All existing tests pass (update assertions to match new output)
- [ ] `bin/dust lint markdown` passes

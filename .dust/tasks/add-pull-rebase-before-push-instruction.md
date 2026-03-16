# Add Pull Rebase Before Push Instruction

Add a `git pull --rebase` step to the implementation instructions, immediately before the push step.

## Context

When multiple agents work on the same repository (via `dust bucket` or parallel `dust loop` instances), pushes can fail if the remote branch has moved ahead. This wastes a feedback cycle because the agent must then pull, re-run checks, and push again.

Adding `git pull --rebase` before push front-loads the sync step, reducing failed pushes and wasted check cycles.

## Implementation

Modify `buildImplementationInstructions` in `lib/cli/commands/focus.ts` to add a new step before the push step:

```typescript
steps.push(`${step}. Run \`git pull --rebase\` to incorporate any remote changes`)
step++

steps.push(`${step}. Push your commit to the remote repository`)
```

This keeps the instruction minimal -- agents already know how to handle rebase conflicts when they occur.

## Principles

- [Fast Feedback Loops](../principles/fast-feedback-loops.md)
- [Trunk-Based Development](../principles/trunk-based-development.md)
- [Atomic Commits](../principles/atomic-commits.md)

## Blocked By

(none)

## Definition of Done

- `buildImplementationInstructions` includes a `git pull --rebase` step before push
- Existing tests pass (update any snapshot tests if needed)
- `bin/dust check` passes

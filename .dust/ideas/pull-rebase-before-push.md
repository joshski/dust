# Pull Rebase Before Push

Instruct agents to run `git pull --rebase` immediately before attempting to push, reducing wasted effort from failed pushes.

## Problem

When agents follow the standard workflow (implement, commit, push), their push may fail if the remote branch has moved ahead since they started working. This happens when:

1. Multiple agents work on the same repository (via `dust bucket` or parallel `dust loop` instances)
2. A human pushes changes while an agent is working
3. The agent takes long enough that another iteration completes first

When a push fails due to "non-fast-forward" errors, the agent must:
1. Realize the push failed
2. Pull/rebase to incorporate remote changes
3. Re-run `dust check` to verify the rebased code still passes
4. Attempt to push again

This doubles the check overhead for that task — the agent ran checks once before the failed push, then again before the successful push.

## Proposed Solution

Modify the implementation instructions to include a `git pull --rebase` step immediately before pushing. The instruction sequence would become:

1. Create commit with all changes
2. Run `git pull --rebase` to incorporate any remote changes
3. If conflicts arise, resolve them
4. If rebase brought in changes, re-run `dust check`
5. Push the commit

This front-loads the sync step, ensuring the push is more likely to succeed on the first attempt.

## Current Implementation

The push instruction is generated in `lib/cli/commands/focus.ts:76`:
```typescript
steps.push(`${step}. Push your commit to the remote repository`)
```

This is used by:
- `dust focus` command output
- `runOneIteration` in `lib/loop/iteration.ts` via `buildImplementationInstructions`
- `dust new task` instructions

The loop already does a `git pull` at the start of each iteration (line 127 of `iteration.ts`), but this happens before the agent starts working — by the time the agent finishes and tries to push, the remote may have moved ahead.

## Trade-offs

### Benefits
- Reduces wasted check cycles when pushes fail
- Agents complete tasks faster on average
- Aligns with the [Fast Feedback Loops](../principles/fast-feedback-loops.md) principle
- Deterministic behavior — always pull before push rather than reacting to push failures

### Considerations
- Adds complexity to agent instructions
- Agents must handle rebase conflicts (they already must handle this when push fails)
- If `git pull --rebase` fails, the agent needs clear guidance on resolution
- Small overhead for the common case where no remote changes exist

## Related

- [Remove special "git recovery" logic](remove-special-git-recovery-logic.md) — discusses handling git pull failures at iteration start
- [Trunk-Based Development](../principles/trunk-based-development.md) — agents commit directly to main
- [Fast Feedback Loops](../principles/fast-feedback-loops.md) — minimize wasted cycles
- [Actionable Errors](../principles/actionable-errors.md) — error messages should guide resolution

## Open Questions

### Should the instruction include conflict resolution guidance?

#### Include detailed guidance

Add explicit instructions for handling rebase conflicts, such as:
```
If conflicts arise during rebase:
1. Resolve conflicts in affected files
2. Stage resolved files with `git add`
3. Continue rebase with `git rebase --continue`
4. Re-run `dust check` before pushing
```

This makes agents more autonomous but adds length to instructions.

#### Keep instructions minimal

Simply instruct `git pull --rebase` and trust agents to handle conflicts when they arise. Most pushes won't have conflicts, so detailed guidance would be noise in the common case.

### Should checks be re-run after a clean rebase?

#### Always re-run checks after rebase

If `git pull --rebase` brings in any changes, always re-run `dust check` before pushing. This ensures the combination of local and remote changes is valid, even if there were no conflicts.

#### Only re-run if there were conflicts

If the rebase was clean (no conflicts), skip re-running checks. The local changes passed checks before commit, and the remote changes presumably passed checks when they were pushed. This saves time but could miss subtle interactions.

#### Let agents decide

Instruct agents to "consider re-running checks if significant changes were rebased." This adds judgment overhead but might be appropriate for context-dependent decisions.

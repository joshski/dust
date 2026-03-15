# Remove special "git recovery" logic

The `dust loop` and `dust bucket` commands have special logic to handle git pull failures by spawning Claude to resolve conflicts. Should this be removed in favor of a simpler approach?

## Context

When `runOneIteration` (in `lib/loop/iteration.ts`) runs, it first attempts a `git pull`. If the pull fails (e.g., merge conflicts, uncommitted local changes), rather than failing immediately, it spawns Claude with a prompt to resolve the issue:

```typescript
const prompt = `Note: Do NOT run \`dust agent\`.

git pull failed with the following error:

${pullResult.message}

Please resolve this issue. Common approaches:
1. If there are merge conflicts, resolve them
2. If local commits need to be rebased, use git rebase
3. After resolving, commit any changes and push to remote

Make sure the repository is in a clean state and synced with remote before finishing.`
```

This triggers an `agent-session-started` event with `purpose: 'git-conflict'` and counts as a completed iteration if successful.

## Why This Logic Exists

The recovery logic handles scenarios where the working copy diverges from the remote:

1. **Uncommitted changes**: If a previous agent run made changes but crashed before committing
2. **Merge conflicts**: If remote changes conflict with local commits
3. **Rebase needed**: If local commits need rebasing onto remote

## Arguments for Removal

**Simpler alternative exists**: If git is in an inconsistent state because an agent failed to commit, a `git reset --hard && git clean -fd` would restore a clean slate more reliably than asking another agent to "resolve" an unknown issue. The related idea [Kill inactive process in dust loop claude](kill-inactive-process-in-dust-loop-claude.md) already proposes this approach.

**Fresh context anyway**: When the loop starts a new iteration, it gets fresh context. The previous agent's uncommitted changes have no value — they represent incomplete work that should be discarded and retried from scratch.

**Recovery success is uncertain**: Asking Claude to "resolve" git issues is open-ended. The error message might be cryptic, the resolution path unclear. This could lead to the agent making things worse or burning an iteration on futile attempts.

**Trunk-based workflow assumption**: Per [Trunk-Based Development](../principles/trunk-based-development.md), agents commit directly to main. If changes aren't committed and pushed, they were never valid work products. Discarding them is appropriate.

## Arguments for Keeping

**Handles real conflicts**: When multiple agents work on the same repository (e.g., via `dust bucket`), legitimate merge conflicts can occur. These aren't "forgotten commits" — they're concurrent changes that need reconciliation.

**Preserves work**: If an agent made progress but didn't complete, the recovery logic might salvage that work by committing it. A hard reset loses everything.

**Actionable errors**: Per [Actionable Errors](../principles/actionable-errors.md), giving Claude the error message and asking it to fix the problem follows the principle of providing context and guidance.

## Related

- [Kill inactive process in dust loop claude](kill-inactive-process-in-dust-loop-claude.md) — proposes `git reset --hard` as recovery for stuck agents
- [Bucket dead loop recovery](bucket-dead-loop-recovery.md) — discusses "reset git" as one recovery option
- `lib/loop/iteration.ts` — the current git recovery implementation
- `lib/bucket/repository-loop.ts` — calls `runOneIteration`, inheriting this behavior

## Open Questions

### Should we remove the special git recovery logic entirely?

#### Remove and use `git reset --hard`

When `git pull` fails, immediately run `git reset --hard origin/main && git clean -fd` to restore a clean state, then retry the pull. This is deterministic, fast, and doesn't burn an iteration on an uncertain recovery attempt. The downside is that any uncommitted work is lost without analysis.

#### Remove and fail fast

When `git pull` fails, abort the iteration entirely and emit an error event. Let the remote service or human operator decide how to proceed. This is the most conservative approach but may leave the loop stuck if the failure is persistent.

#### Keep but add a fallback

Keep the current logic, but if Claude fails to resolve the issue (current behavior: return `no_tasks` and continue), add a `git reset --hard` as a fallback. This tries the intelligent approach first but has a safety net.

#### Keep as-is

The current logic handles edge cases and follows the "give Claude a chance" philosophy. It may be imperfect but is better than nothing.

### When is git actually in an inconsistent state?

#### Agent crashed mid-iteration

The previous Claude process was killed or crashed after making file changes but before committing. This is the main scenario the task description mentions. These are "forgotten" commits — incomplete work that should probably be discarded.

#### Concurrent agents created conflicts

In `dust bucket`, multiple repositories run in parallel. If the same repository is somehow cloned twice (a bug) or if an external process pushes changes, conflicts could arise. These might be legitimate conflicts worth resolving.

#### Manual intervention between iterations

A human made changes to the repository between loop iterations. The human's changes might conflict with what the agent was about to pull. This is an unusual workflow but possible.

### Should recovery behavior differ between `dust loop` and `dust bucket`?

#### Same behavior for both

Keep the logic unified. Both use `runOneIteration`, so they naturally share behavior. This is simpler to maintain and reason about.

#### `dust bucket` should be more aggressive

In `dust bucket`, repositories are cloned fresh and exist in isolation. There's no risk of losing "real" work. A hard reset is always safe. In contrast, `dust loop` might run in a developer's working directory where hard reset could lose important changes.

#### `dust bucket` should be more conservative

In `dust bucket`, the remote service can track recovery attempts and escalate. Emit an event and let the service decide, rather than taking aggressive local action.

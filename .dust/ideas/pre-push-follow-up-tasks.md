# Pre-push follow up tasks

Decouple the `git push` step from individual agent sessions in the loop, allowing multiple agent sessions to run before pushing.

Currently, each task implementation session includes the full lifecycle: implement → commit → push. This is visible in `lib/cli/commands/focus.ts:43-48`, where the agent is instructed to "Push your commit to the remote repository" as part of the task implementation instructions. The `git push` happens within the same agent session that performs the implementation.

The idea is to move `git push` out of the individual session scope (similar to how `git pull` and `dust check` were already pulled out to the loop orchestration layer in `lib/loop/iteration.ts:361-423`). This would enable **multiple agent sessions to run before a single push**.

## Current loop structure

From `lib/loop/iteration.ts`, each iteration follows this sequence:

1. **git pull** (lines 361-380) — syncs with remote, handled at loop orchestration layer
2. **dust next** — finds available tasks
3. **dust install** (optional) — installs dependencies if configured
4. **dust check** (lines 402-423) — pre-flight validation, handled at loop orchestration layer
5. **Agent session: implement task** — agent receives focus instructions, implements, commits, and **pushes** (all in one session)

The `git push` currently happens inside step 5, as part of the agent's responsibility.

## Proposed structure

Move `git push` to the loop orchestration layer:

1. **git pull** — syncs with remote (orchestration layer)
2. **dust check** — pre-flight validation (orchestration layer)
3. **Agent session: implement task** — implements and commits locally (no push)
4. **Agent session: review implementation** — reviews the commit, optionally requests changes
5. **git push** — pushes all local commits (orchestration layer)

This allows running multiple agent sessions (steps 3-4, or even 3 followed by multiple review/fix cycles) before a single push operation.

## Benefits

**Reduced scope for implementation sessions** — The implementation agent focuses purely on solving the task, without the responsibility for pushing. This aligns with the [Small Units](../principles/small-units.md) principle by separating implementation from integration.

**Post-implementation review becomes possible** — Every implementation can be followed by a review session before pushing. The review agent sees the completed commit and can catch issues that the implementation agent missed. This provides a quality gate without requiring human intervention.

**Batch multiple commits before network operations** — The loop could complete several tasks (each with their own commit) before pushing all at once. This reduces network overhead and provides natural batching for related changes.

**Failed reviews don't pollute remote history** — If a review session rejects a commit, the fix happens locally. Only successful work reaches the remote repository, keeping the shared history cleaner.

## Relationship to existing mechanisms

**Pre-push hook still applies** — The git pre-push hook (installed via `lib/git/hooks.ts:23-30`) already validates pushes by running `dust pre push` (`lib/cli/commands/pre-push.ts`). Moving `git push` to the orchestration layer means the hook runs at a different point in the workflow, but its validation logic remains relevant.

**Checks remain in implementation sessions** — The task description asks "I think we would still want to keep checks in the same implementation session though... do you agree?" Based on the [Fast Feedback Loops](../principles/fast-feedback-loops.md) principle, yes — checks should stay as close to implementation as possible. The agent needs immediate feedback on test failures and linting errors while the code is still fresh in context. Moving checks out of the session would slow down the feedback loop and force agents to context-switch between implementation and fix cycles.

**Differs from branch-based review** — The [Loop Review Process](loop-review-process.md) idea proposes creating branches for each task and reviewing on a separate branch. This idea keeps all work on the same branch but inserts a review session before pushing. The two ideas could be combined (branch-based workflow with pre-push review sessions), but they solve different problems: branch-based review provides isolation and PR-like workflow, while pre-push review provides a quality gate without branching overhead.

## Open Questions

### Where should the review session occur in the loop iteration?

#### Immediately after implementation, before moving to next task

Each task implementation is followed by a review session in the same loop iteration. The sequence becomes: pull → check → implement → review → push → next iteration. This keeps the review close to the implementation and ensures that only reviewed work is pushed. The downside is that it doubles the number of agent sessions per task, increasing cost and latency. A failed review also blocks the loop from picking up new tasks until the issue is resolved.

#### After multiple implementations, before push

The loop batches multiple task implementations and runs a single review session that examines all pending commits before pushing. This amortizes the cost of review across multiple tasks and reduces latency for simple changes. However, if the review finds issues, it's harder to identify which task introduced the problem, and fixing requires the agent to understand multiple changes at once.

#### As a separate task type in the queue

Reviews become tasks themselves, generated automatically after implementation tasks complete. This makes reviews explicitly visible in the task queue and allows prioritizing review tasks independently. The cost is additional complexity in task generation and lifecycle management, plus potential for review tasks to accumulate if the loop can't keep up.

### How should the loop handle review failures?

#### Reset to previous commit and retry the task

If the review rejects the implementation, the loop runs `git reset --hard HEAD~1` to discard the commit and puts the task back in the queue. A fresh implementation session picks up the task later. This is clean and simple but loses all work from the failed attempt — sometimes the implementation was 90% correct and only needed a small fix.

#### Keep the commit and spawn a fix session

The review agent writes feedback, and the loop spawns a new agent session to fix the identified issues. The fix session has access to both the original task and the review feedback. This preserves the original work and allows incremental fixes, but risks retry loops if the fix session makes the same mistakes as the original implementation.

#### Mark the task as failed and move on

The loop abandons the task after a review failure, marking it with a special status or moving it to a "failed" queue for human review. This prevents infinite loops and keeps the autonomous loop moving, but accumulates unresolved work that requires human intervention.

### Should checks run before or after the review session?

#### Before review (current behavior)

Checks run before the implementation session (pre-flight) and the agent is responsible for ensuring checks still pass after implementation. The review session assumes checks have passed. This matches the current loop behavior and keeps fast feedback during implementation, but means the review agent might review code that fails checks (if the implementation agent made a mistake).

#### After implementation, before review

Checks run after the implementation session commits but before the review session starts. If checks fail, the loop spawns a fix session before review. This ensures the review agent never sees failing code, but adds latency — the implementation agent doesn't get immediate feedback on check failures.

#### After review, before push

Checks run only after the review session approves the change, just before pushing. This minimizes check runs (one per push rather than one per task) but means both the implementation and review sessions might miss check failures until the very end.

### What should the review session's scope be?

#### Only review the most recent commit

The review agent examines the single commit created by the implementation session and decides whether it satisfies the task requirements. This is focused and fast but ignores the broader context — the commit might be correct in isolation but conflict with recent changes or introduce regressions that only appear when considered alongside earlier commits.

#### Review all unpushed commits together

The review session examines all commits since the last push (which could be multiple tasks if batching is enabled). This provides a holistic view and can catch integration issues, but makes attribution harder — if the review finds a problem, which task is responsible? It also increases the review session's complexity and cost.

#### Review the working tree state against the remote

The review agent compares the current working tree to the remote branch (e.g., `origin/main`) and judges whether the overall change is acceptable, regardless of how many commits are involved. This is simple and matches how a human reviewer would think, but loses the per-task traceability that individual commit reviews provide.

### Should review be mandatory for all tasks, or configurable?

#### Mandatory for all tasks

Every task implementation is followed by a review session before pushing. This provides consistent quality control but increases cost and latency for all work, even trivial changes. Simple tasks like fixing typos or updating documentation would still require a full review session.

#### Configurable per task type

Some task types (e.g., workflow tasks that only modify `.dust/` artifacts) skip review, while implementation tasks require it. This reduces overhead for low-risk changes but requires a mechanism for classifying tasks and deciding which ones need review. Task metadata would need to carry this classification.

#### Configurable per repository

Repositories opt into review sessions via `.dust/config/settings.json`. Teams that want full autonomy can disable reviews, while teams that prioritize quality can enable them. This provides flexibility but means the loop's behavior varies by repository, complicating documentation and testing.

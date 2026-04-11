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

## Resolved Questions

### Where should the review session occur in the loop iteration?

**Decision:** Immediately after implementation, before moving to next task.

Review of 8 dustbucket commits showed that per-commit DoD non-compliance was the dominant failure mode (missing tests, missing rationale, incomplete acceptance criteria). Reviewing each implementation before moving on catches these issues early and prevents compounding — e.g., two consecutive commits implementing the same feature with divergent patterns, where the inconsistency would have been caught on the second review.

### How should the loop handle review failures?

**Decision:** Keep the commit and spawn a fix session that commits with `--amend`.

Most issues observed in practice were small gaps (missing test, wrong import style, incomplete DoD item) rather than fundamental design failures — a reset-and-retry would discard 90% correct work. The fix session amends the original commit so the history stays clean: one commit per task, not a trail of fixups.

### Should review be mandatory for all tasks, or configurable?

**Decision:** Review applies to implementation tasks only, by default.

Workflow-only commits (those touching only `.dust/` artifacts) were consistently clean across the reviewed history. Implementation commits showed issues in 7 of 8 cases. Reviewing workflow tasks would add cost and latency with little return.

### Should checks run before or after the review session?

**Decision:** Before review (current behavior)

Checks run before the implementation session (pre-flight) and the agent is responsible for ensuring checks still pass after implementation. The review session assumes checks have passed. This matches the current loop behavior and aligns with the [Fast Feedback Loops](../principles/fast-feedback-loops.md) principle — the implementation agent needs immediate feedback on check failures while the code context is fresh.

### What should the review session's scope be?

**Decision:** Review the working tree state against the remote

The review agent compares the current working tree to the remote branch (e.g., `origin/main`) and judges whether the overall change is acceptable. This is simple and matches how a human reviewer would think about the change.

## Open Questions

### How should the review session signal its verdict to the loop?

#### Structured marker in agent output

The review agent outputs a machine-readable marker (e.g., `DUST_REVIEW_RESULT: pass` or `DUST_REVIEW_RESULT: fail`) that the loop parses. This is deterministic and explicit but brittle if the model omits or misformats the marker.

#### Git state heuristics

The loop infers the outcome from repository state: if the review agent made no additional commits or amendments, the review passed; if the working tree or HEAD changed, the review flagged issues and made fixes. This requires no output contract but is ambiguous — a review agent that identifies problems without committing fixes would appear to have passed.

#### Review report file

The review agent writes a structured file (e.g., `.dust/state/review-report.md`) with pass/fail status and findings, and the loop reads that file. This is explicit and inspectable but introduces a state file that needs lifecycle management and cleanup.

### How many fix-review cycles should be allowed per task?

#### No explicit limit

Each fix-then-review cycle counts as one loop iteration. The existing loop iteration limit provides an indirect cap. Simple to implement but may exhaust all iterations on a single stuck task.

#### Fixed limit of one retry

Allow exactly one fix attempt per task. If the second review also fails, push the commit anyway (or skip and move on). Eliminates unbounded loops with minimal configuration.

#### Configurable limit per repo

A new settings key (e.g., `reviewRetries: 2`) controls the maximum fix cycles. Explicit and user-controllable but expands the configuration surface.


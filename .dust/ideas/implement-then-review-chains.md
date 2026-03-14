# Implement-then-review Chains

This umbrella idea is too broad as written. We should not implement it as a single feature. The current recommendation is to keep only the loop-orchestration slice and spin the rest into separate ideas.

## Findings

### Current loop behavior conflicts with chains

`dust loop` currently performs one agent session per picked task and gives that session instructions to complete the full lifecycle (check, implement, commit, push). There is no concept of per-task phase progression.

Relevant code paths:
- [`lib/cli/commands/loop.ts`](../../lib/cli/commands/loop.ts) builds a single prompt and runs one session with `purpose: 'task'`
- [[`lib/cli/commands/focus.ts`](../../lib/cli/commands/focus.ts)](../../lib/cli/commands/focus.ts) hardcodes instructions that include commit and push in the same run
- [[`lib/cli/commands/next.ts`](../../lib/cli/commands/next.ts)](../../lib/cli/commands/next.ts) only selects unblocked task files; it does not track in-progress phase state

### Existing artifact model has no place for chain state

Task parsing supports blockers, principles, and definition-of-done ([[`lib/artifacts/tasks.ts`](../../lib/artifacts/tasks.ts)](../../lib/artifacts/tasks.ts)). Workflow tasks support refine/decompose/shelve transitions ([[`lib/artifacts/workflow-tasks.ts`](../../lib/artifacts/workflow-tasks.ts)](../../lib/artifacts/workflow-tasks.ts)). Neither supports resumable, phase-based execution for a single task.

### Settings model cannot express a review chain

[[`lib/config/settings.ts`](../../lib/config/settings.ts)](../../lib/config/settings.ts) validates a closed set of keys and does not include any chain/review policy key. Adding chain configuration would require schema and docs updates, not just loop changes.

### This overlaps with branch-based review work

[Loop Review Process](loop-review-process.md) already covers independent review sequencing using branches. Chain-based review on the same branch is a different strategy, but the two ideas overlap on review roles, rejection handling, and handoff semantics.

## Recommendation

Keep this idea only for: “resume the same task across multiple loop sessions with explicit phase state.”

Split out the other concerns into separate ideas:
1. Review policy and gate semantics (who reviews, pass/fail/escalation)
2. Review content model (UX/test/security phase definitions and prompts)
3. Optional project/task-level review configuration in settings or task metadata

This matches [Small Units](../principles/small-units.md), avoids overloading one change, and keeps implementation traceable.

## Proposed Scope (for this idea)

Implement minimal chain orchestration for one task across multiple sessions:
1. Task enters `implement` phase
2. Loop runs agent for current phase
3. Loop advances phase based on explicit pass/fail output
4. Task is only considered complete at final `push` phase

Do not include configurable review personas or branch workflow in this idea.

## Open Questions

### Where should per-task phase state live?

#### State file under [`.dust/`](..)

Store phase progression in a dedicated state file (for example, `.dust/state/task-phases.json`).

Pros: explicit, inspectable, restart-safe; keeps task markdown stable.
Cons: introduces lifecycle/cleanup concerns and potential stale state.

#### Task-file metadata section

Store current phase directly in the task markdown.

Pros: single source of truth in artifacts.
Cons: causes frequent task-file churn and can blur planning artifacts with runtime state.

### How should a phase signal pass/fail to the loop?

#### Structured sentinel in agent output

Require a machine-readable marker (for example, `DUST_PHASE_RESULT: pass|fail`) that loop parses.

Pros: deterministic state transitions; simple for automation.
Cons: brittle if the model omits/misformats output.

#### Git/state-based heuristics only

Infer progress from repository state (new commit, pushed commit, clean tree) without explicit markers.

Pros: no extra output contract.
Cons: ambiguous for review phases that may only request changes.

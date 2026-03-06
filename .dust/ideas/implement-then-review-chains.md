# Implement-then-review Chains

Allow a single atomic change to span multiple agent sessions with distinct purposes. For example: implement, review UX, review tests, then push.

## Background

Currently, each dust session follows a single-session model where the agent:
1. Picks up a task
2. Implements the change
3. Creates an atomic commit
4. Pushes to remote

This works well for straightforward tasks, but some changes benefit from multi-pass review before landing. The existing [Loop Review Process](loop-review-process.md) idea explores separating implementation from review using branches. This idea takes a different angle: keeping work on the same branch but structuring sessions as a chain where each session has a specific purpose.

## Concept

A task could specify (or dust could infer) that it requires a "review chain" — a sequence of sessions that must complete before the final push. For example:

1. **Session 1: Implement** — Agent implements the feature and commits (but does not push)
2. **Session 2: Review UX** — Fresh agent reviews the change from a UX perspective, suggests or makes improvements, amends/adds commits
3. **Session 3: Review Tests** — Fresh agent reviews test coverage, adds missing tests, refactors test code
4. **Session 4: Push** — Final agent verifies all reviews passed and pushes to remote

Each session starts with a fresh context but inherits the working directory state (including unpushed commits) from the previous session.

## Why This Matters

- **Quality gates without branches** — Multiple review perspectives without the complexity of branch-based workflows
- **Separation of concerns** — Each session focuses on one aspect (implementation, UX, tests, security, etc.)
- **Fresh context per phase** — Avoids the tunnel vision that can develop in long sessions
- **Preserves trunk-based development** — Changes still land atomically on main, just with more thorough review

## Relationship to Loop Review Process

The [Loop Review Process](loop-review-process.md) idea proposes using branches to separate implementation from review. Review chains could work alongside or as an alternative:

- **Branch-based review** (Loop Review Process): Implementation happens on a branch; a separate agent reviews and merges. Good for changes that benefit from clean-room review by an independent agent.
- **Chain-based review** (this idea): Implementation stays on main/current branch; multiple sessions add review passes before pushing. Good for systematic multi-aspect review where each phase adds value incrementally.

These approaches aren't mutually exclusive — a branch-based review could itself use a chain (implement → review UX → review tests → merge).

## Implementation Considerations

### How sessions know they're in a chain

One option is task-level configuration: the task file specifies a review chain:

```markdown
## Review Chain

1. Implement
2. Review: UX
3. Review: Tests
```

Another option is session-level detection: dust detects unpushed commits and prompts for a review phase.

### Session handoff

Each session needs to know:
- What phase it's in (implement, review-ux, review-tests, push)
- What the previous session accomplished
- What it should focus on

This could be achieved via:
- A chain state file (e.g., `.dust/chain/current.json`)
- Commit message conventions (e.g., `[chain:review-ux]` prefix)
- A dedicated artifact type for chain progress

### Integration with dust loop

The loop would need to understand chain state:
- Don't start a new task if the current task is mid-chain
- Pick up the next phase in the chain instead
- Only mark the task complete after the final push phase

## Relevant Principles

- [Atomic Commits](../principles/atomic-commits.md) — The final result is still one logical change, just with more thorough preparation
- [Agent Autonomy](../principles/agent-autonomy.md) — Each session operates independently within its defined scope
- [Small Units](../principles/small-units.md) — Breaking review into phases keeps each session focused

## Open Questions

### How should chain phases be defined?

#### Task-declared phases

The task file explicitly lists the review phases needed. This gives task authors control over what review is appropriate for each change.

```markdown
## Review Chain
1. Implement
2. Review: UX
3. Review: Tests
4. Push
```

**Pros:** Explicit, predictable, task-specific
**Cons:** Adds complexity to task authoring; most tasks may not need custom chains

#### Project-level default chain

Configure a default review chain in `.dust/config/settings.json` that applies to all tasks unless overridden.

```json
{
  "reviewChain": ["implement", "review-ux", "review-tests", "push"]
}
```

**Pros:** Consistent process across all tasks, one-time setup
**Cons:** May be overkill for simple tasks; harder to skip phases when not needed

#### Agent-requested phases

The implementing agent can request additional review phases when it completes. For example, after implementing a UI change, the agent adds "needs UX review" to the chain.

**Pros:** Adaptive to actual needs; agents can judge complexity
**Cons:** Inconsistent application; agents may skip reviews they should request

### What should happen when a review phase finds issues?

#### Return to implementation phase

If the UX review identifies problems, the chain resets to the implementation phase with the review findings as context.

**Pros:** Clean separation between review and fix
**Cons:** Could create loops; loses review context when re-implementing

#### Fix in the review phase

The reviewing agent fixes issues it discovers rather than sending back. Each review phase can both review and remediate.

**Pros:** More efficient; reviewer has context for the fix
**Cons:** Blurs the line between review and implementation; reviewer may not have implementation expertise

#### Fail the chain

If any review phase fails, the entire chain fails and the task is marked as blocked with findings attached.

**Pros:** Clear escalation path; ensures reviews are meaningful
**Cons:** May be too strict for minor issues; creates task churn

### Should chain state persist across loop restarts?

#### Yes, persist in a state file

Store chain progress in a file (e.g., `.dust/chain/current.json`) that survives loop restarts. The loop reads this file to know where to resume.

**Pros:** Robust to interruptions; human can inspect state
**Cons:** Another file to manage; potential for stale state

#### Yes, persist via git metadata

Use unpushed commits as the chain state indicator. If there are unpushed commits matching the current task, the loop knows to continue the chain.

**Pros:** Uses existing git state; no new files
**Cons:** Harder to know which phase to run next; relies on commit message parsing

#### No, chains must complete in one loop run

A chain must finish before the loop ends. If interrupted, start the chain over.

**Pros:** Simpler implementation; clean state on each run
**Cons:** Wastes work on interruption; chains can't span human review periods

### Should reviews happen in fresh agent sessions or continue in the same session?

#### Fresh sessions (clean-room review)

Each review phase starts a new agent session with fresh context. The agent sees only the diff, task description, and phase-specific instructions.

**Pros:** Independent perspective; avoids anchoring bias from implementation
**Cons:** Loses implementation context; may misunderstand intentional decisions

#### Same session, different prompts

The implementing agent continues through all phases, receiving different prompts for each phase. This is more like self-review than independent review.

**Pros:** Maintains context; more efficient
**Cons:** Same agent reviewing its own work; may miss its own blind spots

#### Configurable per phase

Allow the chain definition to specify whether each phase needs a fresh session or can continue.

```markdown
## Review Chain
1. Implement
2. Review: UX (fresh)
3. Review: Tests (continue)
4. Push (continue)
```

**Pros:** Flexible; can optimize for each review type
**Cons:** More configuration complexity

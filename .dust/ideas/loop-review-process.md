# Loop Review Process

Rework `dust loop claude` so that each iteration involves 2 steps instead of committing directly to main.

Steps:

1. **Create a branch for the change** — The implementing agent creates a branch (thereby marking it as WIP) and implements the change in that branch.

2. **Review and merge** — A separate agent (in a fresh sandbox) reviews the change and merges it into main.

This separation provides:
- Clear visibility into work-in-progress via branches
- Quality control through independent review
- Isolation between implementation and review contexts
- A natural checkpoint before changes land on main

## Open Questions

### Who should perform the review — an AI agent or a human?

#### AI agent review only

A separate agent instance (with a fresh context) reviews the branch and decides whether to merge. This preserves full autonomy and keeps the loop running without human intervention. The risk is that two AI agents may share the same blind spots — the reviewer might approve changes that a human would catch as misguided or subtly wrong. This works well for mechanical correctness (tests pass, style is clean) but may miss higher-level concerns like whether the change actually serves the goal.

#### Human review only

The implementing agent creates the branch and then the loop pauses until a human reviews and merges. This gives maximum quality control but fundamentally changes the loop from autonomous to human-gated. The loop becomes a task proposer rather than a task executor. For teams that want AI to draft work but not land it, this is appropriate. For solo developers or teams that want overnight autonomous progress, the latency is a dealbreaker.

#### AI review with human escalation

The reviewing agent merges straightforward changes automatically but flags uncertain or high-risk changes for human review. This preserves autonomy for routine work while keeping humans in the loop for consequential decisions. The challenge is defining "high-risk" — the reviewing agent needs heuristics for when to escalate (e.g. changes to configuration, deletions, changes touching many files), and those heuristics may not match what the team actually considers risky.

### What should happen when the review rejects a change?

#### Abandon the task and move on

If the reviewer rejects the branch, the task is marked as failed and the loop picks up the next task. This keeps the loop moving and avoids infinite retry loops on a fundamentally flawed approach. The cost is that useful work may be discarded — sometimes a change needs a small fix rather than a complete restart. Failed branches accumulate as dead code unless cleaned up.

#### Send feedback to the implementing agent for a retry

The reviewer writes feedback explaining the issues, and a new implementing agent picks up the task with the review comments as additional context. This mimics a real code review workflow and gives the implementation a chance to improve. The risk is retry loops — if the implementing agent keeps making the same mistake, the loop burns tokens without progress. A retry limit (e.g. 2 attempts) would mitigate this but adds configuration complexity.

#### Revert to a simpler version of the task

When a review fails, the system breaks the original task into smaller pieces and attempts each one separately. This is sophisticated but hard to implement well — decomposing a failed task requires understanding why it failed and what a simpler version would look like, which is itself a non-trivial reasoning task. It could lead to very small, possibly incoherent changes landing independently.

### Should the reviewer have access to the implementation agent's reasoning?

#### Clean-room review (no context)

The reviewer sees only the diff and the task description, with no access to the implementing agent's conversation or reasoning. This simulates an independent code review and avoids anchoring bias — the reviewer judges the code on its own merits. The downside is that the reviewer may not understand the rationale behind certain design decisions, leading to rejections of intentional tradeoffs.

#### Full context sharing

The reviewer receives the implementing agent's full conversation log, including its reasoning about tradeoffs and alternatives considered. This helps the reviewer understand why the code looks the way it does and reduces false rejections. However, it introduces anchoring — the reviewer may accept the implementing agent's reasoning uncritically rather than forming an independent judgment. It also increases the token cost of review significantly.

#### Structured handoff notes

The implementing agent writes a brief summary of key decisions and tradeoffs when it finishes, and only this summary is passed to the reviewer (not the full conversation). This is a middle ground — the reviewer gets enough context to understand intentional choices without being overwhelmed or anchored by the full reasoning chain. The cost is that the implementing agent must produce useful handoff notes, which adds a step and may not always capture the right details.

### How should branch naming and lifecycle be managed?

#### Ephemeral branches, deleted after merge or rejection

Each task gets a branch like `dust/task-<id>`, which is deleted immediately after merge or rejection. This keeps the repository clean and avoids branch clutter. The downside is loss of history — if you want to revisit a rejected approach later, it's gone. This is fine if you trust the review process and don't expect to revisit failed attempts.

#### Persistent branches with status tags

Branches are kept and tagged with their outcome (e.g. `merged`, `rejected`, `abandoned`). This preserves a complete record of all attempted work and makes it possible to revisit or cherry-pick from rejected branches. The cost is repository clutter — over time, dozens or hundreds of stale branches accumulate and need periodic cleanup. A retention policy (e.g. delete rejected branches after 7 days) would help but adds maintenance logic.

#### PR-based workflow using the hosting platform

Instead of local branches and merges, the agent creates pull requests on GitHub/GitLab. This leverages existing review infrastructure (PR comments, CI checks, approval workflows) and integrates with how most teams already work. The downside is a hard dependency on a specific hosting platform and network access, which breaks the local-first design. It also means the loop can't run fully offline

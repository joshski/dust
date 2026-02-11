# Abandon tasks that are too hard

When a task is too hard, an agent should abandon it and add a blocking task that tackles one hard part in isolation.

This directly applies the [Make the Change Easy](../goals/make-the-change-easy.md) goal to agent workflow. Currently, when an agent encounters a task that exceeds its capacity — whether due to scope, complexity, or missing prerequisites — it has no structured way to respond. The agent either pushes through (producing poor results or burning context window) or silently fails. A better outcome is for the agent to recognize difficulty early, stop, and decompose the problem by creating a smaller blocking task that addresses the hardest part.

The existing [Blocked By](../goals/small-units.md) mechanism already supports this pattern. An agent could create a new task that isolates one difficult aspect, add it as a blocker on the original task, and commit that change instead of the implementation. The original task remains in the backlog, now blocked, and a future agent iteration picks up the smaller prerequisite task. Each iteration peels off one hard layer until the original task becomes straightforward.

This differs from simply splitting a task into subtasks. The agent is not decomposing the full scope up front — it is identifying the single thing that makes the current task hard, extracting that into a standalone task, and leaving the rest untouched. The original task's definition of done stays the same. Only its blockers change.

## Open Questions

### How should an agent recognize that a task is "too hard"?

#### Explicit heuristics in agent instructions

The focus instructions could list concrete signals: "If you need to modify more than N files, if you've spent more than M minutes without progress, if you're unsure which approach to take, consider abandoning." This gives agents clear triggers but risks being either too aggressive (agents bail too easily) or too conservative (the heuristics don't cover real cases of difficulty). Heuristics also vary by codebase and task type.

#### Agent self-assessment

The agent uses its own judgment to decide when a task is too hard, without prescribed thresholds. This respects the agent's understanding of the specific situation but depends on the agent's ability to recognize its own limits — something current LLMs are inconsistent at. An agent might push through a bad approach rather than admitting difficulty, or conversely abandon tasks that are merely unfamiliar.

#### Trigger on check failures or repeated errors

The system detects difficulty mechanically: if checks fail multiple times, or the agent has made and reverted changes, it automatically suggests abandoning. This is objective and doesn't rely on agent self-awareness, but it only catches difficulty that manifests as errors — not tasks that are hard because the approach is unclear or the scope is too large.

### What should the "abandon" commit look like?

#### Create blocker task only

The agent creates a new task file that captures the hard part, adds it to the original task's Blocked By section, and commits just those two file changes (new task + modified original task). The commit message could follow a pattern like "Add blocking task: <blocker title>". This is minimal and clean but doesn't capture why the agent decided to abandon.

#### Create blocker task with rationale in commit message

Same as above, but the commit message includes a brief explanation of what made the task hard and why the new blocking task is the right next step. This provides traceability through commit history without adding extra files or sections. Reviewers can understand the decomposition decision from the git log.

#### Create blocker task with rationale in the original task file

The agent appends a section to the original task file documenting the difficulty encountered and the decomposition rationale. This keeps the context co-located with the task but changes the task file format and might accumulate noise if a task is abandoned multiple times.

### Should there be a limit on how many times a task can be abandoned?

#### No limit

A task can accumulate blockers indefinitely. Each iteration peels off one hard part, and eventually the task becomes easy enough to complete. This is theoretically elegant but risks infinite decomposition — a task that keeps spawning blockers may be fundamentally misconceived rather than merely hard. Without a limit, no one is forced to reconsider whether the task should exist at all.

#### Fixed limit with escalation

After N abandonments (e.g. 3), the task is flagged for human review. This provides a safety valve against infinite decomposition while still allowing agents to decompose when appropriate. The challenge is choosing N and defining what "escalation" looks like in practice — is it a special status in the task file, a notification, or a shelve-idea workflow task?

### Should this be an automated workflow or guidance in agent instructions?

#### Automated workflow command

A new command like `dust abandon` that handles the mechanics: creates the blocker task from a template, updates the original task's Blocked By section, and formats the commit. This reduces the chance of agents getting the format wrong and standardizes the process. The downside is implementation effort and the risk of over-automating a decision that benefits from human-like judgment about what the "hard part" actually is.

#### Guidance in agent instructions only

The focus instructions describe the pattern and trust the agent to execute it manually using existing tools (creating files, editing markdown). This is zero implementation effort and keeps the system simple. The risk is that agents may not follow the pattern consistently, or may get the file format wrong when creating blocker tasks manually.

# Inline implementation in decompose idea

Allow agents to implement directly during decompose-idea when the plan is sufficiently detailed, rather than always creating intermediate task files.

## Background

The current workflow for decompose-idea tasks always produces new task files:

1. Agent picks up a "Decompose Idea" task
2. Agent reads the idea file and plans the implementation
3. Agent creates one or more task files in `.dust/tasks/`
4. Agent deletes the original idea file
5. (Later) Agent picks up the new tasks and implements them

This workflow provides traceability via the [Task-First Workflow](../principles/task-first-workflow.md) principle. However, when an idea is already well-specified and the agent has laid out a detailed plan, creating intermediate task files can feel like unnecessary ceremony:

- The agent has already done the cognitive work of understanding the implementation
- The context is already loaded
- Creating a task file only to immediately pick it up adds friction
- For simple, well-defined ideas, this overhead doesn't improve outcomes

The existing "Expedite Idea" pattern (see `EXPEDITE_IDEA_PREFIX` in `lib/artifacts/workflow-tasks.ts:11`) demonstrates that direct implementation is sometimes appropriate. Expedite Idea tasks instruct agents to "implement directly and commit" if "confident the implementation is straightforward".

## Concept

During decompose-idea, allow the agent to make a judgment call: if the implementation is clear and doesn't warrant separate tasks, implement inline rather than creating task files.

The heuristic could be based on:
- Whether the agent can think of more than one logical task
- Whether the implementation spans multiple unrelated concerns
- Whether the scope is small enough to fit in a single commit

If only one clear task emerges, the agent could implement it directly. If multiple tasks emerge, the agent creates task files as normal.

## Considerations

This relates to several existing principles:

- [Lightweight Planning](../principles/lightweight-planning.md) - "deferring detail until the last responsible moment"
- [Small Units](../principles/small-units.md) - tasks should be "narrowly scoped" and "completable in single commits"
- [Context Window Efficiency](../principles/context-window-efficiency.md) - avoiding redundant steps that consume tokens without adding value
- [Task-First Workflow](../principles/task-first-workflow.md) - the tension between traceability and efficiency

The "Expedite Idea" workflow already handles the case where users want to fast-track simple ideas. This idea extends that concept to decompose-idea, where the agent has already researched and planned.

## Open Questions

### Should this be agent judgment or explicit instruction?

#### Agent uses judgment based on decomposition outcome

The decompose-idea instructions tell agents: "If you can only identify one clear task, implement it directly. If multiple tasks emerge, create task files." This lets agents decide based on what they discover.

Pros: Flexible, adapts to the specific idea, reduces friction for simple cases
Cons: Inconsistent behavior, may lead to agents implementing when they shouldn't, harder to trace decisions

#### Explicit flag or threshold when creating decompose task

Add a parameter when creating decompose-idea tasks that signals whether inline implementation is allowed. This could be set based on idea complexity or human preference.

Pros: Explicit control, predictable behavior, maintains traceability
Cons: Adds complexity to task creation, requires human judgment upfront

#### Always create task files but allow immediate pickup

Keep the current behavior (always create task files) but optimize the agent flow so that if only one task is created, the agent automatically picks it up and implements it in the same session.

Pros: Maintains traceability, still efficient for simple cases, consistent workflow
Cons: Still creates an intermediate file, slightly more overhead than pure inline

### How does this interact with commit atomicity?

#### One commit for decompose + implement

If implementing inline, the decompose-idea task completion and the actual implementation happen in one commit. The commit message might be "Decompose Idea: X" but the commit also contains implementation.

Pros: Fewer commits, faster workflow
Cons: Loses traceability distinction between planning and implementation, commit message doesn't reflect implementation

#### Two commits: decompose then implement

Even with inline implementation, create two commits: one that deletes the idea file (acknowledging decomposition is complete), and one that implements. The decompose commit is essentially a no-op if implementing inline.

Pros: Maintains commit history patterns, clear separation of concerns
Cons: Adds ceremony, empty or near-empty commits feel wasteful

#### Change commit message to reflect actual work

If implementing inline during decompose, use a commit message like "Implement: X" instead of "Decompose Idea: X" to accurately reflect what happened.

Pros: Accurate commit history, clear what was done
Cons: Breaks consistency with workflow task naming conventions

### What prevents scope creep?

#### Definition of Done must still be met

Inline implementation is only allowed if the resulting work satisfies a clear Definition of Done. If the agent can't articulate completion criteria, it should create task files instead.

Pros: Maintains quality bar, ensures completeness
Cons: Requires agent to self-assess, subjective judgment

#### Size limit heuristic

Only allow inline implementation if the expected change is under a certain size (e.g., fewer than 5 files, fewer than 200 lines). Larger changes always create task files.

Pros: Objective threshold, prevents runaway implementations
Cons: Arbitrary limits may not match actual complexity, some small changes are risky

#### Human review gate

Inline implementation produces a commit that must be reviewed before being considered complete. This is different from task-based workflow where the task file itself signals pending work.

Pros: Human remains in the loop, catches mistakes
Cons: Adds latency, may defeat the efficiency gains

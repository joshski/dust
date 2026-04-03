# Explicitly mention sticking to principles

Task completion prompts should explicitly tell agents to adhere to project principles when implementing changes.

## Current State

When agents receive task files to implement, the workflow task system mentions principles in two specific contexts:

1. **Decompose Idea tasks** (lib/artifacts/workflow-tasks.ts:573): Tell agents to "Run `dust principles` to identify relevant principles (both core and local), then inline the FULL content of ALL selected principles in a Guidance section in each new task file." This ensures decompose agents embed principle content in new task files.

2. **Implement tasks with Principles sections** (e.g., commit c8544f9f): Some implement tasks include a `## Principles` section that links to relevant principles, followed by a `## Guidance` section that inlines the full principle content.

However, the core implementation instructions in `buildImplementationInstructions()` (lib/cli/commands/focus.ts:14-98) do not mention principles at all. When agents run `dust focus` or `dust pick task`, they receive:

- A numbered list of steps (install dependencies, run checks, implement, commit, push)
- Instructions about commit structure (delete task file, update facts, delete idea file)
- No guidance to consult or follow project principles

## The Gap

Agents working on implement tasks may not be explicitly reminded to:
- Read and follow the principles linked in the task's `## Principles` section
- Apply the guidance inlined in the `## Guidance` section
- Consider principles when making implementation decisions
- Verify their implementation aligns with stated principles

While the decompose workflow ensures principles are embedded in task files, there's no explicit instruction in the implementation workflow telling agents "read this guidance and stick to these principles."

## Relevant Principles

The following principles relate to this idea:

- **agent-autonomy**: Agents should be able to produce work autonomously without frequent human clarification
- **ideal-agent-developer-experience**: The agent is the developer, so the workflow should optimize for agent effectiveness
- **task-first-workflow**: Work should be captured as a task before implementation begins, creating traceability between intent and outcome
- **traceable-decisions**: The commit history should explain why changes were made, not just what changed

## Open Questions

### Where should we add principle adherence reminders?

#### Option: Add to buildImplementationInstructions()

Modify `buildImplementationInstructions()` in lib/cli/commands/focus.ts to include an explicit step or note about reading and following any principles/guidance sections in the task file.

Advantages:
- Applies to all implement tasks uniformly
- Appears at the moment agents are starting work
- Keeps implementation guidance in one central location

Disadvantages:
- May be redundant for tasks without principle sections
- Could add noise to the already multi-step implementation instructions
- Doesn't help for tasks that forgot to include principles

#### Option: Add to task file templates

Modify the workflow task templates in lib/artifacts/workflow-tasks.ts to include explicit instructions about principle adherence in the task opening sentence or definition of done.

Advantages:
- Embeds the reminder directly in each task file
- Can be tailored per task type (decompose tasks already do this well)
- More visible since it's part of the task content agents read first

Disadvantages:
- Only affects newly created tasks
- Doesn't help with existing tasks
- Duplicates guidance across many task files

#### Option: Add to both locations

Combine both approaches: update `buildImplementationInstructions()` to mention principles, and also strengthen the task templates.

Advantages:
- Redundancy ensures agents see the reminder
- Works for both new and existing tasks
- Reinforces the importance through repetition

Disadvantages:
- Most verbose option
- May feel repetitive to human readers
- Could make implementation instructions longer

### How explicit should the reminder be?

#### Option: Simple reminder

Add a single line like "Follow the principles and guidance outlined in the task file."

Advantages:
- Brief and non-intrusive
- Assumes agents will know what to do
- Doesn't add much length

Disadvantages:
- May be too generic
- Agents might skip over it
- Doesn't emphasize importance

#### Option: Explicit instructions

Add specific instructions like "Before implementing, read the ## Principles and ## Guidance sections of the task file. Ensure your implementation aligns with these principles."

Advantages:
- Clear and actionable
- Tells agents exactly what to do
- Emphasizes the importance of principles

Disadvantages:
- Longer and more prescriptive
- May feel redundant if principles aren't present
- Could increase overall instruction length

#### Option: Conditional reminder

Only show principle reminders when a task file actually contains `## Principles` or `## Guidance` sections.

Advantages:
- No noise for tasks without principles
- More targeted and relevant
- Keeps instructions concise when possible

Disadvantages:
- Requires parsing task file content
- More complex implementation
- May miss cases where principles should have been included

### Should we validate principle adherence?

#### Option: No validation

Simply remind agents to follow principles, but don't enforce it through tooling.

Advantages:
- Simple to implement
- Trusts agents to do the right thing
- No additional overhead

Disadvantages:
- No feedback if agents ignore principles
- Can't detect drift from principles
- Relies entirely on agent behavior

#### Option: Add principle adherence checks

Create a `dust check` or audit that reviews recent commits or current work against stated principles.

Advantages:
- Provides feedback on principle alignment
- Catches cases where principles are violated
- Makes principles more than just aspirational

Disadvantages:
- Complex to implement (requires semantic analysis)
- Could be too strict or produce false positives
- Adds overhead to the development loop

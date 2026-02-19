# Capture "Complexity Estimate" in tasks

Simple tasks can be performed by simple (cheap, fast) models or agents.

By capturing a complexity estimate in tasks, downstream systems could choose a model or agent according to the estimated complexity. A task that involves a single-line fix might use a smaller, faster model, while a task requiring multi-file architectural changes might use a more capable model.

## Context

Currently, tasks have no metadata indicating their expected difficulty. The `SpawnOptions` in `lib/claude/types.ts` already supports a `model` parameter, allowing callers to specify which model to use. However, there is no mechanism within task files themselves to suggest an appropriate model based on complexity.

The existing task file format (defined in `.dust/facts/task-file-format.md`) requires three sections: `## Principles`, `## Blocked By`, and `## Definition of Done`. A new `## Complexity` section would be an optional addition that agents or orchestration systems could use to inform model selection.

Related ideas like [Task priority](task-priority.md) add metadata to tasks for ordering; complexity differs in that it relates to capability requirements rather than urgency.

## How it could work

A new optional section `## Complexity` would contain a single keyword indicating estimated difficulty. For example:

```markdown
## Complexity

low
```

The orchestration layer (such as `dust loop` or a CI integration) would read this value when spawning an agent and pass an appropriate model via `SpawnOptions.model`.

## Open Questions

### What scale should be used for complexity?

#### Simple/complex binary

Two levels: `simple` and `complex`. Easy to understand and assign. However, binary distinctions may be too coarse — some tasks fall clearly in between.

#### Low/medium/high

Three levels matching the priority scale from the [Task priority](task-priority.md) idea. Familiar and reasonably expressive, though agents may struggle to distinguish medium from high consistently.

#### Numeric scale (1-5 or 1-10)

Fine-grained estimation. Allows for nuanced model mapping but may introduce false precision. Agents might not estimate reliably at this granularity.

### Who estimates complexity?

#### Human author when creating the task

The person writing the task assigns a complexity. This captures human judgment but adds friction to task creation and may be skipped or done inconsistently.

#### Agent during task creation

When an agent creates a task (via `decomposeIdea` or other workflows), it estimates complexity. This automates the process but relies on the agent's ability to predict task difficulty before doing the work.

#### Agent at task pickup time

The agent estimates complexity when it selects a task but before starting implementation. This allows complexity to inform model choice dynamically but adds latency to task pickup.

### Should complexity affect which tasks an agent is offered?

#### No, complexity only informs model selection

The task picker shows all unblocked tasks regardless of complexity. Once a task is selected, the orchestrator uses complexity to choose an appropriate model. This separates concerns cleanly.

#### Yes, filter tasks by agent capability

If the current agent or model is known to be limited, only show tasks below a certain complexity threshold. This prevents capable models from being assigned trivial tasks and vice versa, but requires awareness of agent capabilities in the picker.

### Should the section be required or optional?

#### Required in all tasks

Ensures every task has complexity metadata. Consistent data for orchestration but adds friction and requires retroactive updates to existing tasks.

#### Optional with a default

Tasks without a `## Complexity` section are treated as having a default complexity (e.g., medium). Reduces friction but means many tasks may lack explicit estimates.

### How does this relate to model costs and latency?

#### Direct mapping in configuration

A settings file maps complexity levels to specific models: `{ low: "haiku", medium: "sonnet", high: "opus" }`. Clear and explicit, but couples task metadata to model names that may change.

#### Abstracted capability tiers

Complexity maps to abstract tiers like `fast`, `balanced`, `capable`. The orchestrator translates tiers to actual models based on current availability and configuration. More flexible but adds indirection.

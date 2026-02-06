# Goal-Driven Task Generation

Analyze the codebase against a stated goal and propose tasks to better achieve it.

## Concept

Goals describe desired outcomes, but there's currently no way to ask "what work would help us achieve this goal?".

An agent could:
1. Read the goal file to understand the intent
2. Explore the codebase for areas that don't align
3. Propose concrete tasks that would improve alignment

## Open Questions

### Should generated tasks require human approval before entering the backlog?

#### Auto-add to backlog

Generated tasks go straight into `.dust/tasks/` as pending work. This maximizes autonomy and allows the loop to discover and act on goal gaps without human intervention. The risk is low-quality or misguided tasks cluttering the backlog, especially if the goal is ambiguous. Works best when goals are tightly scoped and the codebase is well-understood by the agent.

#### Require explicit approval

Generated tasks are written to a staging area (e.g. `.dust/proposed-tasks/`) and a human reviews them before they become real work. This preserves human control over the direction of work and prevents wasted effort on tasks that miss the point. The cost is latency — the loop stalls waiting for human input, which defeats the purpose of autonomous operation.

#### Auto-add with a confidence threshold

The agent assigns a confidence score to each proposed task. High-confidence tasks are added directly; low-confidence ones go to staging for review. This is a pragmatic middle ground, but introduces the problem of calibrating the threshold and the risk that the agent's self-assessed confidence doesn't correlate well with actual task quality.

### How should the agent analyze the codebase for goal alignment?

#### Static analysis only

The agent reads source files, tests, and documentation to assess alignment. This is simple, fast, and doesn't require running anything. However, it can miss runtime behaviors, performance characteristics, and integration issues that only surface when code executes. Best suited for goals about code structure, patterns, or documentation.

#### Run existing checks and tests

The agent executes the project's test suite and checks, then analyzes the results alongside the goal. This catches functional gaps (e.g. missing test coverage for a goal area) and real failures. The downside is that it's slower, requires a working build environment, and the agent needs to interpret test output in the context of a goal — which may be a stretch for loosely-defined goals.

#### LLM-based semantic reasoning over the full codebase

The agent uses its language understanding to reason about the codebase holistically — reading code, inferring intent, and comparing it against the goal's spirit rather than just its letter. This is the most powerful approach for nuanced goals but also the most expensive in terms of tokens and time. It may also produce false positives where the agent "imagines" gaps that aren't real.

### How granular should generated tasks be?

#### Fine-grained, immediately actionable tasks

Each generated task is small enough to implement in a single loop iteration (e.g. "add validation to the `name` field in `UserForm`"). This makes tasks easy to pick up and complete, but may generate a large volume of trivial tasks that obscure the bigger picture.

#### Coarse-grained, directional tasks

Generated tasks describe larger chunks of work (e.g. "improve input validation across all form components"). These are easier to reason about at a planning level but may be too vague for an agent to implement without further decomposition. This shifts the burden of task breakdown to the implementing agent or a human.

#### Mixed granularity with parent-child relationships

The agent generates high-level tasks and breaks each one into subtasks. This provides both the big picture and actionable steps, but adds complexity to the task format and requires the task system to support hierarchy — which it currently doesn't

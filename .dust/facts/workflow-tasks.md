# Workflow Tasks

Workflow tasks are structured templates for progressing ideas from intake to execution.

## Task Types

Dust supports five task types, each identified by a `## Task Type` section in the task file:

- `capture` — Start from a title and description to create one or more idea files
- `implement` — Execute well-defined work directly
- `refine` — Clarify an existing idea by resolving open questions
- `decompose` — Break an existing idea into smaller, implementable tasks
- `shelve` — Archive an existing idea that won't be pursued

The task type is derived from the content of the `## Task Type` section. Title prefixes like "Add Idea:", "Refine Idea:", etc. are optional conventions for human readability but are not used for type detection.

Implementation lives in `lib/artifacts/workflow-tasks.ts` and is exposed through `buildArtifactsRepository(...)` in `lib/artifacts/index.ts`.

For focused details and examples, see:

- [Workflow Task Repository](./workflow-task-repository.md)
- [Workflow Task Capture](./workflow-task-capture.md)
- [Workflow Task Transitions](./workflow-task-transitions.md)
- [Workflow Task Hints](./workflow-task-hints.md)

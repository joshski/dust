# Workflow Tasks

Workflow tasks are structured templates for progressing ideas from intake to execution.

Dust models workflow tasks in two groups:

- Capture tasks (`Add Idea` and `Expedite Idea`) that start from a title and description.
- Idea transition tasks (`Refine Idea`, `Decompose Idea`, `Shelve Idea`) that operate on an existing idea file.

Implementation lives in `lib/artifacts/workflow-tasks.ts` and is exposed through `buildArtifactsRepository(...)` in `lib/artifacts/index.ts`.

For focused details and examples, see:

- [Workflow Task Repository](./workflow-task-repository.md)
- [Workflow Task Capture](./workflow-task-capture.md)
- [Workflow Task Transitions](./workflow-task-transitions.md)
- [Workflow Task Hints](./workflow-task-hints.md)

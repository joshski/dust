# Workflow Task Repository

`buildArtifactsRepository(fileSystem, dustPath)` exposes workflow task operations through a single repository interface.

## Write Methods

- `createIdeaTask({ title, description, expedite?, dustCommand? })`
- `createRefineIdeaTask({ ideaSlug, description?, openQuestionResponses?, dustCommand? })`
- `createDecomposeIdeaTask({ ideaSlug, description?, openQuestionResponses?, dustCommand? })`
- `createShelveIdeaTask({ ideaSlug, description?, dustCommand? })`
- `createExpediteIdeaTask({ ideaSlug, description?, dustCommand? })`

## Read Methods

- `findWorkflowTaskForIdea({ ideaSlug })`
- `parseCaptureIdeaTask({ taskSlug })`
- `buildTaskGraph()`

## Read-Only Repository

`buildReadOnlyArtifactsRepository(fileSystem, dustPath)` includes all parse/list methods plus workflow lookup helpers (`findWorkflowTaskForIdea`, `parseCaptureIdeaTask`, `buildTaskGraph`) but omits task creation methods.

## Example

Given `dustPath = ".dust"`, calling `repository.createRefineIdeaTask({ ideaSlug: "better-task-help" })` writes a task file in `.dust/tasks/` and returns `{ filePath: ".dust/tasks/refine-idea-better-task-help.md" }`.

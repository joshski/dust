# Add "Expedites Idea" section to expedite tasks

Add a `createExpediteIdeaTask` transition function that creates tasks with an "Expedites Idea" back-reference section. This makes expedite tasks consistent with decompose/refine/shelve transitions and trackable by `findAllWorkflowTasks`.

## Changes

In `lib/artifacts/workflow-tasks.ts`:
- Add `'expedite-idea'` to `WorkflowTaskType`
- Add `'Expedite Idea: '` to `IDEA_TRANSITION_PREFIXES`
- Add `{ type: 'expedite-idea', heading: 'Expedites Idea' }` to `WORKFLOW_SECTION_HEADINGS`
- Create `createExpediteIdeaTask(fileSystem, dustPath, ideaSlug, description?, dustCommand?)` using `createIdeaTransitionTask` (follows the same pattern as `createShelveIdeaTask`, `createRefineIdeaTask`, etc.)

In `lib/artifacts/index.ts`:
- Add `createExpediteIdeaTask` to the `ArtifactsRepository` interface and both `buildArtifactsRepository` / `buildReadOnlyArtifactsRepository` (read-only should omit write methods, so only add to the writable one)
- Export the new function and any new types

In `lib/lint/validators/idea-validator.ts`:
- Add `'Expedite Idea: ': 'Expedites Idea'` to `WORKFLOW_PREFIX_TO_SECTION`

`findAllWorkflowTasks` and `findWorkflowTaskForIdea` already iterate `WORKFLOW_SECTION_HEADINGS`, so they will automatically pick up expedite tasks in `workflowTasksByIdeaSlug` once the heading is added.

Update facts:
- `workflow-task-transitions.md` — add Expedite Idea prefix and section
- `workflow-task-capture.md` — note that expedite tasks can also be created as transitions (with back-reference)
- `workflow-task-repository.md` — add `createExpediteIdeaTask` to write methods

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md) — `createExpediteIdeaTask` is a pure function delegating to `createIdeaTransitionTask`; keep it side-effect free except for the final `writeFile`
- [Consistent Naming](../principles/consistent-naming.md) — follow established naming: `Expedites Idea` section heading mirrors `Decomposes Idea`, `Refines Idea`, `Shelves Idea`
- [Comprehensive Test Coverage](../principles/comprehensive-test-coverage.md) — add tests for the new function, section rendering, and `findAllWorkflowTasks` integration
- [Make the Change Easy](../principles/make-the-change-easy.md) — the existing `createIdeaTransitionTask` helper and `WORKFLOW_SECTION_HEADINGS` array make this change straightforward

## Blocked By

(none)

## Definition of Done

- [ ] `createExpediteIdeaTask` creates a task with an "Expedites Idea" section linking to the source idea
- [ ] `findAllWorkflowTasks` includes expedite tasks in `workflowTasksByIdeaSlug`
- [ ] `findWorkflowTaskForIdea` returns expedite tasks
- [ ] Lint validation enforces the "Expedites Idea" section for "Expedite Idea:" prefixed tasks
- [ ] Facts are updated to reflect the new transition type

# Update task type detection to use Task Type section

Replace title-based and section-based task type detection with a unified approach that reads the `## Task Type` section.

This is the core functional change — updating the "functional core" parsing logic to derive task type from the `## Task Type` section instead of title prefixes.

## Background

Current task type detection uses two different approaches:
- Title prefixes for capture tasks (`findAllWorkflowTasks`, `parseCaptureIdeaTask`)
- Section headings for transition tasks (`findWorkflowTaskForIdea`, `WORKFLOW_SECTION_HEADINGS`)

The new approach uses a single canonical source: the `## Task Type` section.

## Implementation

In `lib/artifacts/workflow-tasks.ts`:

1. Create new function `parseTaskType(content: string): TaskType | null` that extracts and validates the task type from the `## Task Type` section

2. Update `WorkflowTaskType` type to be a unified `TaskType` covering all five types: `'implement' | 'capture' | 'refine' | 'decompose' | 'shelve'`

3. Update `findAllWorkflowTasks()`:
   - Use `parseTaskType()` instead of checking title prefixes
   - Update to work with the new `TaskType` union
   - Remove dependencies on `CAPTURE_IDEA_PREFIX` and `EXPEDITE_IDEA_PREFIX`

4. Update `parseCaptureIdeaTask()`:
   - Use `parseTaskType()` instead of checking title prefixes
   - Map task type to the `expedite` boolean for backward compatibility (type === 'implement' means expedite = true)
   - Eventually this function can be deprecated as callers migrate to using task type directly

5. Keep `findWorkflowTaskForIdea()` working during transition:
   - Try `parseTaskType()` first
   - Fall back to section-based detection if task type section is missing (for backward compatibility)
   - This allows gradual migration of existing tasks

6. Update constants:
   - Remove `IDEA_TRANSITION_PREFIXES`, `CAPTURE_IDEA_PREFIX`, `EXPEDITE_IDEA_PREFIX` (or mark as deprecated if needed for backward compatibility)

Update tests in `lib/artifacts/workflow-tasks.test.ts` to verify the new parsing logic works correctly.

## Task Type

implement

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Make Changes with Confidence](../principles/make-changes-with-confidence.md)
- [Comprehensive Test Coverage](../principles/comprehensive-test-coverage.md)

## Blocked By

- [Update task creation to generate Task Type section](./update-task-creation-to-generate-task-type-section.md)

## Definition of Done

- `parseTaskType()` function extracts task type from `## Task Type` section
- `TaskType` type includes all five task types
- `findAllWorkflowTasks()` uses task type section instead of title prefixes
- `parseCaptureIdeaTask()` uses task type section instead of title prefixes
- Backward compatibility maintained during transition
- Tests verify parsing logic
- `bin/dust check` passes

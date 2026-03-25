# Update task creation to generate Task Type section

Modify all task creation functions to include a `## Task Type` section with the appropriate type value.

This updates the "imperative shell" — the functions that create tasks — to generate the new `## Task Type` section while maintaining backward compatibility during the transition.

## Background

Task creation functions in `lib/artifacts/workflow-tasks.ts` generate task files for different workflow types. These need to emit the new `## Task Type` section.

## Implementation

Update the following functions in `lib/artifacts/workflow-tasks.ts`:

1. `createRefineIdeaTask()` - emit `## Task Type\n\nrefine`
2. `decomposeIdea()` - emit `## Task Type\n\ndecompose`
3. `createShelveIdeaTask()` - emit `## Task Type\n\nshelve`
4. `createExpediteIdeaTask()` - emit `## Task Type\n\nimplement`
5. `createIdeaTask()`:
   - For expedite mode: emit `## Task Type\n\nimplement`
   - For capture mode: emit `## Task Type\n\ncapture`

The `## Task Type` section should appear early in the task file, after the title and opening description but before other sections like `## Idea Description` or `## Blocked By`.

Update tests in `lib/artifacts/workflow-tasks.test.ts` to verify that created tasks include the `## Task Type` section.

## Task Type

implement

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Comprehensive Test Coverage](../principles/comprehensive-test-coverage.md)

## Blocked By

(none)

## Definition of Done

- All task creation functions emit `## Task Type` section
- Task type values match the new taxonomy (implement, capture, refine, decompose, shelve)
- Tests verify that created tasks include correct task type
- `bin/dust check` passes

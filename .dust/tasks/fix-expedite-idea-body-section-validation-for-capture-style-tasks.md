# Fix expedite idea body section validation for capture-style tasks

`validateWorkflowTaskBodySection` in `lib/lint/validators/idea-validator.ts` unconditionally requires a `## Expedites Idea` section for all tasks with the `Expedite Idea:` prefix. But `createIdeaTask(expedite: true)` in `lib/artifacts/workflow-tasks.ts` creates capture-style expedite tasks that have `## Idea Description` instead — there is no existing idea file to link to.

The title validator (`validateIdeaTransitionTitle`) already has an exception for this case (lines 180-186), but the body section validator does not.

## Fix

Add the same exception to `validateWorkflowTaskBodySection`: if the task has an `## Idea Description` section and the prefix is `Expedite Idea:`, skip the `## Expedites Idea` requirement.

## Blocked By

(none)

## Definition of Done

- `validateWorkflowTaskBodySection` skips the `## Expedites Idea` requirement for capture-style expedite tasks (those with `## Idea Description`)
- Tests cover both capture-style and transition-style expedite task validation
- The lint violation from the remote commit `8f1fdc8` no longer reproduces

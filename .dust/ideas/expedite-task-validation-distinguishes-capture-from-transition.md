# Expedite Task Validation Distinguishes Capture from Transition

The validator incorrectly flags capture-style "Expedite Idea:" tasks as invalid. It assumes all tasks with that prefix reference an existing idea file, but capture-style expedite tasks don't have one.

## Problem Summary

There are two types of "Expedite Idea:" tasks:

1. **Capture-style** (created by `createIdeaTask({ expedite: true })`): Contains an `## Idea Description` section and does NOT reference an existing idea file. This is a combined capture-and-implement workflow.

2. **Transition-style** (created by `createExpediteIdeaTask(ideaSlug)`): Contains an `## Expedites Idea` section with a link to an existing idea file. This operates on an existing idea.

The validator treats both identically, requiring an idea file to exist for any task titled `Expedite Idea: <Title>`. When a capture-style expedite task is created, it fails lint because no corresponding idea file exists.

## Observed Incident

1. Commit `3f1a2bb` created a capture-style expedite task `expedite-idea-add-fact-about-artifact-patch-api.md`
2. This caused `bin/dust check` to fail with "Idea transition task references non-existent idea"
3. Commit `097544f` deleted the task to fix the check failure
4. The intended work (adding a fact about the artifact patch API) was never completed

## Fix Approach

Modify `validateIdeaTransitionTitle` to detect capture-style expedite tasks by checking for the presence of `## Idea Description` section. If present, skip the idea file existence check.

Alternatively, update the validator to only check for idea file existence when the task contains the corresponding `## Expedites Idea` section linking to an idea file.

## References

- `lib/artifacts/workflow-tasks.ts:518-568` - `createIdeaTask` with `expedite: true` creates capture-style tasks
- `lib/artifacts/workflow-tasks.ts:492-516` - `createExpediteIdeaTask` creates transition-style tasks
- `lib/lint/validators/idea-validator.ts:166-191` - `validateIdeaTransitionTitle` performs the check
- `.dust/facts/workflow-task-capture.md` - Documents both expedite task modes

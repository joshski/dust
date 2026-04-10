# Clarify task dependency guidance in new-task instructions

Add explicit guidance to workflow task templates so agents populate `## Blocked By` when one created task depends on another.

## Context

When `decomposeIdea` or `createExpediteIdeaTask` runs, agents create one or more task files. Each task file includes a `## Blocked By` section (rendered as `(none)` by `renderTask` in `lib/artifacts/workflow-tasks.ts:470`), but neither template's opening sentence tells agents when or why to populate it.

The `## Blocked By` section is functional — `parseTask` in `lib/artifacts/tasks.ts:103` reads markdown links from it and exposes them as `blockedBy: string[]` on the `Task` object. The loop command can use this to avoid running a blocked task before its prerequisites are done.

Without guidance, agents treat `## Blocked By` as boilerplate and leave it as `(none)` even when the tasks they create have clear sequencing requirements — e.g., a schema migration task that must land before an API endpoint task.

## Affected Templates

- `decomposeIdea` (line 566) — the primary template where multiple related tasks are created; currently has no mention of `blockedBy`
- `createExpediteIdeaTask` (line 616) — can also create multiple task files with no dependency guidance

The `createIdeaTask` capture path is out of scope because it produces idea files, not tasks.

## Proposed Change

Add a sentence to the `decomposeIdea` (and `createExpediteIdeaTask`) opening instructions reminding agents to link dependent tasks via `## Blocked By` using relative markdown links:

```
If the tasks you create have ordering requirements — where one task depends on another completing first — populate the ## Blocked By section of the dependent task with a relative link to its prerequisite, e.g., `- [Prerequisite Task](../tasks/prerequisite-task.md)`.
```

This is consistent with the existing `## Blocked By` format and how `parseTask` reads it.

## Open Questions

### Which templates should receive the dependency guidance?

#### Option: Decompose template only

`decomposeIdea` is the canonical place where structured multi-task decomposition happens. Expedite is a fast-path and rarely produces multiple tasks.

#### Option: Both decompose and expedite templates

`createExpediteIdeaTask` can produce multiple task files and has the same blind spot. Adding consistent guidance to both avoids the gap.

### How explicit should the guidance be?

#### Option: Prose reminder with format example

Include the example link syntax (e.g., a list item with a relative link to the prerequisite task file) inline in the template instruction, matching the style already used in `createRefineIdeaTask` for open question formatting.

#### Option: Prose reminder only, no example

Keep the instruction short. Agents familiar with the `## Blocked By` format from the task file format docs don't need a syntax reminder.

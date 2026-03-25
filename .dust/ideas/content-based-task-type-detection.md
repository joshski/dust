# Content-based task type detection

Make task type mandatory for all tasks via a `## Task Type` section, replacing title-prefix-based detection.

## Current State

Task types are currently detected using a hybrid approach:

1. **Title prefixes** (`Add Idea: `, `Expedite Idea: `, `Refine Idea: `, etc.) in `workflow-tasks.ts`:
   - `findAllWorkflowTasks()` checks `CAPTURE_IDEA_PREFIX` and `EXPEDITE_IDEA_PREFIX`
   - `parseCaptureIdeaTask()` determines `expedite` status from title prefix

2. **Section-based detection** for transition tasks:
   - `WORKFLOW_SECTION_HEADINGS` defines `Refines Idea`, `Decomposes Idea`, `Shelves Idea`, `Expedites Idea`
   - `findWorkflowTaskForIdea()` scans for these sections to identify task type
   - `parseCaptureIdeaTask()` requires `## Idea Description` section for capture tasks

The section-based approach is already canonical for transition tasks—`findWorkflowTaskForIdea()` explicitly ignores title and looks only at body sections. But capture tasks still rely on title prefixes.

## Proposed Change

Every task has a mandatory `## Task Type` section containing one of these values:

| Task Type | Purpose |
|-----------|---------|
| `implement` | Implement a change (replaces both "standard tasks" and "expedite-idea") |
| `capture` | Research and create idea files |
| `refine` | Research and refine an existing idea |
| `decompose` | Break an idea into implementation tasks |
| `shelve` | Archive and remove an idea |

The old `expedite-idea` type is eliminated. Both "expedite" variants (capture and transition) become `implement` — the agent's job is the same in both cases: implement the thing. Standard implementation tasks (previously untyped) also become `implement`.

Task type is derived solely from the `## Task Type` section. Title prefixes become optional convention for human readability — they are not parsed for semantics.

## Benefits

- **Single source of truth**: Task type lives in a dedicated section, not inferred from title or other sections
- **Editing flexibility**: Renaming a task title doesn't risk breaking type detection
- **No special cases**: Every task has a type, no "no type means standard"
- **Simpler parsing**: One code path — find `## Task Type`, read the value
- **Cleaner taxonomy**: Five types instead of six, with no confusing dual-purpose `expedite-idea`

## Affected Code

- `lib/artifacts/workflow-tasks.ts`:
  - `WorkflowTaskType` — replace with a unified `TaskType` covering all five types
  - `findAllWorkflowTasks()` — detect type from `## Task Type` section instead of title prefixes
  - `parseCaptureIdeaTask()` — simplify, no longer needs title prefix logic
  - Remove `IDEA_TRANSITION_PREFIXES`, `CAPTURE_IDEA_PREFIX`, `EXPEDITE_IDEA_PREFIX`
- `lib/lint/validators/idea-validator.ts`:
  - `validateIdeaTransitionTitle()` — remove or simplify
  - Add validation that `## Task Type` section exists and contains a valid value
- Task creation functions (`createRefineIdeaTask`, `decomposeIdea`, etc.) — generate `## Task Type` section
- `lib/cli/commands/focus.ts` — use `## Task Type` for type detection
- `lib/cli/commands/new-task.ts` — include `## Task Type` in task template

## Resolved Questions

### How to distinguish Add Idea from Expedite Idea capture tasks?

**Decision:** Eliminate the distinction

Both are about taking a description and acting on it. The old `expedite-idea` capture tasks become `implement` tasks. The old `add-idea` capture tasks stay as `capture`. The task type section makes this unambiguous — no need to infer from title prefixes or section combinations.

### Should title prefixes be removed from generated tasks?

**Decision:** Keep prefixes as optional convention

Title prefixes remain in generated tasks for human readability but are not parsed for type detection. This preserves familiarity while making titles purely cosmetic.

### How should "standard" (non-workflow) tasks be handled?

**Decision:** All tasks are typed

There are no untyped tasks. What were previously "standard" implementation tasks get `## Task Type\n\nimplement`. This means every task has a type, eliminating the implicit "no type = implementation task" convention.

### What should task type values be named?

**Decision:** Single-word verbs

Task types use short, consistent verb-form names: `implement`, `capture`, `refine`, `decompose`, `shelve`. No hyphens, no `-idea` suffixes. Each verb clearly describes what the agent does when it picks up the task.

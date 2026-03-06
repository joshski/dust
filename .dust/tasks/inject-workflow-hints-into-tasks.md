# Inject Workflow Hints into Tasks

Read optional hint files from `.dust/config/workflow-hints/` and append their content to workflow task instructions.

When creating workflow tasks (refine, decompose-idea, shelve), check for a corresponding hint file at `.dust/config/workflow-hints/{operation}.md`. If the file exists, append its markdown content to the opening sentence of the generated task.

## Implementation Details

- Hint file paths: `.dust/config/workflow-hints/refine.md`, `.dust/config/workflow-hints/decompose-idea.md`, `.dust/config/workflow-hints/shelve.md`
- The `createIdeaTransitionTask` function in `lib/artifacts/workflow-tasks.ts` generates all workflow tasks
- Hints should be appended after the standard instructions, separated by a blank line
- If the hint file doesn't exist, generate the task without hints (graceful fallback)
- No validation of hint content is required

## Principles

- [Agent Autonomy](../principles/agent-autonomy.md): Allows projects to customize agent behavior for decomposition
- [Easy Adoption](../principles/easy-adoption.md): Hints are optional and don't affect projects that don't use them
- [Lightweight Planning](../principles/lightweight-planning.md): Simple config files, no schema or validation

## Blocked By

(none)

## Definition of Done

- [ ] `createIdeaTransitionTask` reads hint files from `.dust/config/workflow-hints/{operation}.md`
- [ ] Hint content is appended to the task opening sentence when the file exists
- [ ] Tasks generate correctly when no hint file exists
- [ ] Unit tests cover both cases (with hints, without hints)
- [ ] Facts file `.dust/facts/workflow-tasks.md` is updated to document the workflow hints feature

# Add Idea Transition Task Validation

Add linter validation for idea transition tasks, which use special title prefixes to reference ideas.

## Background

An "idea transition task" is a task whose title follows the pattern `<Prefix>: <Idea Title>`, where the prefix indicates what transition to perform on the idea. Three transition types are supported:

- `Refine Idea: <Idea Title>` - Instruct an agent to research and add detail to a vague idea, resolving open questions
- `Create Task From Idea: <Idea Title>` - Instruct an agent to convert a fleshed-out idea into a concrete task
- `Shelve Idea: <Idea Title>` - Instruct an agent to remove an idea that is no longer worth pursuing

The linter should validate that the idea title after the prefix corresponds to an existing idea file. The `titleToFilename` function already handles the conversion (the colon is stripped, producing predictable slugs like `refine-idea-foo-bar.md`).

This convention enables external UIs to infer idea-to-task relationships purely from filenames:

- Task slug `refine-idea-foo-bar.md` → strip `refine-idea-` → idea slug `foo-bar.md`
- Task slug `create-task-from-idea-foo-bar.md` → strip `create-task-from-idea-` → idea slug `foo-bar.md`
- Task slug `shelve-idea-foo-bar.md` → strip `shelve-idea-` → idea slug `foo-bar.md`

## Implementation

Add a `validateIdeaTransitionTitle` function to `lib/cli/commands/lint-markdown.ts`:

1. Define `IDEA_TRANSITION_PREFIXES = ['Refine Idea: ', 'Create Task From Idea: ', 'Shelve Idea: ']`
2. Extract the task title using `extractTitle(content)`
3. If the title starts with a known prefix, extract the idea title (the suffix after the prefix)
4. Convert the idea title to a filename using `titleToFilename(ideaTitle)`
5. Check that `${ideasPath}/${ideaFilename}` exists via `fileSystem.exists()`
6. If it does not exist, return a violation

Call this function in `lintMarkdown()` inside the task file validation loop (around line 725), passing the `ideasPath` that is already resolved earlier in the function.

Export the `IDEA_TRANSITION_PREFIXES` constant so external tools can use the same list.

Also create a fact file `.dust/facts/idea-transition-tasks.md` documenting this convention, so agents and contributors understand the system.

## Goals

- [Lint Everything](../goals/lint-everything.md)
- [Task-First Workflow](../goals/task-first-workflow.md)
- [Lightweight Planning](../goals/lightweight-planning.md)

## Blocked By

(none)

## Definition of Done

- [ ] `IDEA_TRANSITION_PREFIXES` constant is exported from `lint-markdown.ts`
- [ ] `validateIdeaTransitionTitle` function validates task titles against existing idea files
- [ ] The function is called during task file validation in `lintMarkdown()`
- [ ] Unit tests cover: valid transition title, non-existent idea, non-transition title (no false positives)
- [ ] A fact file `.dust/facts/idea-transition-tasks.md` documents the convention (prefixes, filename derivation, UI inference)
- [ ] `bin/dust lint markdown` passes

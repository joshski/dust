# Agent branch context

Add branch context to agent prompts when working on a non-default branch. This helps agents understand their working context and avoid confusion when reading commit history or branch names.

## Background

When the bucket server specifies a target branch, agents should know which branch they're working on. Without this context, an agent might be confused if it sees references to "main" in documentation while actually working on a "staging" branch.

## Implementation

### Pass branch through the call chain

1. `RepositoryState` in `lib/bucket/repository.ts` already holds the `Repository` which will have `branch`
2. Pass `branch` from `repoState.repository.branch` through to `runOneIteration` in `lib/loop/iteration.ts`
3. Add `branch?: string` to `IterationOptions`

### Modify prompt generation

In `buildTaskPrompt` in `lib/loop/iteration.ts`:

1. Add an optional `branch` parameter
2. When `branch` is specified, prepend a line: `You are working on the \`<branch>\` branch.`
3. When `branch` is omitted or undefined, omit this line (default branch, no extra context needed)

### Functional core approach

Pure function (no side effects):

- `buildTaskPrompt(taskPath, taskContent, instructions, toolsSection, branch?)` — generates prompt with optional branch context

Imperative shell (orchestration):

- `runOneIteration` passes branch from options to `buildTaskPrompt`
- `runRepositoryLoop` passes `repoState.repository.branch` to iteration options

## Blocked By

(none)

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Context Window Efficiency](../principles/context-window-efficiency.md)

## Definition of Done

- Agent prompts include branch context when `branch` is specified
- Agent prompts omit branch context for default branch (no change from current behavior)
- Unit tests cover prompt generation with and without branch
- `bin/dust check` passes

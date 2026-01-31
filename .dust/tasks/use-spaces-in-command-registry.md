# Use Spaces in Command Registry

Change the command registry in `lib/cli/main.ts` to use spaces instead of hyphens for multi-word command keys.

## Background

Currently, the command registry maps hyphenated command names to handler functions:

```typescript
export const commandRegistry = {
  'agent-new-task': agentNewTask,
  'agent-pick-task': agentPickTask,
  'lint-markdown': lintMarkdown,
  // ...
}
```

The `resolveCommand` function joins CLI arguments with hyphens to look up commands:

```typescript
const candidate = commandArguments.slice(0, i).join('-')
```

Using spaces instead would make registry keys match the actual CLI invocation more naturally:

```typescript
export const commandRegistry = {
  'agent new task': agentNewTask,
  'agent pick task': agentPickTask,
  'lint markdown': lintMarkdown,
  // ...
}
```

## Changes Required

### 1. Update `lib/cli/main.ts`

- Change all hyphenated command registry keys to use spaces:
  - `'lint-markdown'` -> `'lint markdown'`
  - `'agent-help'` -> `'agent help'`
  - `'agent-new-task'` -> `'agent new task'`
  - `'agent-new-goal'` -> `'agent new goal'`
  - `'agent-new-idea'` -> `'agent new idea'`
  - `'agent-implement-task'` -> `'agent implement task'`
  - `'agent-pick-task'` -> `'agent pick task'`
  - `'agent-understand-goals'` -> `'agent understand goals'`
  - `'subagent-new-task'` -> `'subagent new task'`
  - `'loop-claude'` -> `'loop claude'`
  - `'pre-push'` -> `'pre push'`

- Update `resolveCommand` to join with spaces:
  ```typescript
  const candidate = commandArguments.slice(0, i).join(' ')
  ```

- Update `COMMANDS` filter from `!cmd.includes('-')` to `!cmd.includes(' ')`

- Update comments in the file that reference hyphenated commands

### 2. Update `lib/cli/main.test.ts`

- Rename test section from "hyphenated command routing" to something like "multi-word command routing"
- Update any test comments that reference hyphenated commands

## Notes

- Template file names (e.g., `agent-new-task.txt`) remain hyphenated - these are filesystem names and are a separate naming convention
- The template names passed to `createTemplateCommand` are independent of command registry keys
- No functional behavior changes - this is purely an internal naming convention change

## Goals

(none)

## Blocked by

(none)

## Definition of done

- [ ] Command registry keys use spaces instead of hyphens
- [ ] `resolveCommand` uses `.join(' ')` instead of `.join('-')`
- [ ] `COMMANDS` filter uses `!cmd.includes(' ')` instead of `!cmd.includes('-')`
- [ ] Comments updated to reflect new convention
- [ ] Tests pass with `bun test`
- [ ] Test descriptions updated to reflect new convention

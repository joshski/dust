# Delete unused subagent task command

The `dust subagent task` command and its associated template are defined but never used anywhere in the codebase.

## Files to delete

- `lib/templates/subagent-new-task.txt` - unused template
- `lib/cli/commands/subagent-task.ts` - unused command
- `lib/cli/commands/subagent-task.test.ts` - tests for unused command

## Changes to make

- Remove the import and command registration from `lib/cli/main.ts`:
  - Line 26: `import { subagentTask } from './commands/subagent-task'`
  - Line 62: `'subagent task': subagentTask,`

## Goals

- [Maintainable Codebase](../goals/maintainable-codebase.md)

## Blocked by

(none)

## Definition of done

- [ ] `lib/templates/subagent-new-task.txt` is deleted
- [ ] `lib/cli/commands/subagent-task.ts` is deleted
- [ ] `lib/cli/commands/subagent-task.test.ts` is deleted
- [ ] Import and registration removed from `lib/cli/main.ts`
- [ ] `bin/dust lint typescript` passes
- [ ] `bin/dust check all` passes

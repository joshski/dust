# Refactor Remove Duplication

Extract duplicated process buffering code from `check.ts` and `pre-push.ts` into a shared utility, and consolidate inline color definitions.

## Code Duplication Found

### 1. Process Buffering (High Priority)

`lib/cli/commands/check.ts` defines `createBufferedRunner()` (lines 39-62) and `lib/cli/commands/pre-push.ts` defines `createGitRunner()` (lines 30-53). Both functions:
- Create a process runner that returns `{ exitCode, output }`
- Buffer stdout and stderr chunks
- Handle close and error events identically

The only differences are:
- `createBufferedRunner` uses `shell: true` option
- `createGitRunner` hardcodes `'git'` as the command

### 2. Inline Color Definitions (Medium Priority)

`lib/cli/commands/init.ts` (lines 16-23) defines its own color constants instead of using `getColors()` from `lib/cli/colors.ts`. It also adds `green` and `yellow` colors not present in the shared utility.

## Goals

- [Maintainable Codebase](../goals/maintainable-codebase.md)

## Blocked By

(none)

## Definition of Done

- [ ] Create a shared `createProcessRunner` utility in `lib/cli/process-runner.ts` that handles buffered process execution with configurable options (command, args, shell mode)
- [ ] Update `check.ts` to use the shared process runner
- [ ] Update `pre-push.ts` to use the shared process runner
- [ ] Add `green` and `yellow` colors to `lib/cli/colors.ts`
- [ ] Update `init.ts` to use `getColors()` instead of inline color definitions
- [ ] All existing tests continue to pass

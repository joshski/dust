# Remove 'list' Keyword from Dust Commands

The CLI now supports shorter command syntax where `dust tasks` is equivalent to `dust list tasks`. All references to `dust list <type>` throughout the codebase should be updated to use the shorter form (e.g., `dust tasks`, `dust ideas`, `dust goals`, `dust facts`).

## Files to Update

The following files contain `dust list` references that need updating:

- `system-tests/edge-cases.test.ts` - lines 46, 135, 176, 196
- `system-tests/explore-goals.test.ts` - lines 24, 33
- `system-tests/list-tasks.test.ts` - lines 22, 31
- `system-tests/support/shell-emulator.test.ts` - line 55
- `.dust/facts/command-syntax.md` - line 8
- `.dust/facts/unified-cli.md` - line 3
- `lib/cli/commands/list.ts` - line 2 (comment)
- `lib/cli/commands/new-task.test.ts` - line 38

## Goals

- [Easy Adoption](../goals/easy-adoption.md)

## Blocked By

(none)

## Definition of Done

- [ ] All instances of `dust list tasks` changed to `dust tasks`
- [ ] All instances of `dust list ideas` changed to `dust ideas`
- [ ] All instances of `dust list goals` changed to `dust goals`
- [ ] All instances of `dust list facts` changed to `dust facts`
- [ ] All tests pass after changes
- [ ] `bin/dust lint markdown` passes

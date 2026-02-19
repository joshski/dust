# Complete goals to principles migration

Complete the rename of "goals" to "principles" across the codebase. The directory was renamed but references in code and documentation still use the old terminology.

## Code Changes

Update `lib/cli/commands/new-task.ts` line 63:
- Change `## Goals` to `## Principles`
- Change `../goals/goal-name.md` to `../principles/principle-name.md`
- Change "goals this task supports" to "principles this task supports"

Update corresponding test in `lib/cli/commands/new-task.test.ts` line 51.

## Test Fixture Changes

Update test fixtures that use `## Goals` instead of `## Principles`:
- `lib/cli/commands/pre-push.test.ts` (11 occurrences)
- `lib/cli/commands/check.test.ts` (3 occurrences)

## Documentation Changes

Update `.dust/facts/task-file-format.md`:
- Change `## Goals` to `## Principles`
- Change "goal documents" to "principle documents"

Update `.dust/facts/dust-directory-structure.md`:
- Change `goals/` to `principles/`
- Update description from "Mission statements and principles" to "Guiding principles"

Update `.dust/facts/signals.md`:
- Change "goals" to "principles" in the signal types list

Rename `.dust/facts/goal-hierarchy-design.md` to `.dust/facts/principle-hierarchy-design.md` and update:
- Title from "Goal Hierarchy Design" to "Principle Hierarchy Design"
- All occurrences of "goal" to "principle" within the file
- References from `.dust/goals/` to `.dust/principles/`

## Principles

- [Consistent Naming](../principles/consistent-naming.md)

## Blocked By

(none)

## Definition of Done

- [ ] `new-task.ts` references `## Principles` instead of `## Goals`
- [ ] All test fixtures use `## Principles`
- [ ] Facts files use "principles" terminology
- [ ] `bin/dust check` passes

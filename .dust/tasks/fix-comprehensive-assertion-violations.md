# Fix comprehensive assertion violations

Replace multiple partial assertions with single comprehensive assertions across all test files.

## Violations to fix

### agent.test.ts (lines 37-43)
Replace 7 `toContain` calls checking stdout for agent commands with a single comprehensive assertion.

### agent.test.ts (lines 168-175)
Replace 7 `toContain` calls and length check for `AGENT_SUBCOMMANDS` with `toEqual` containing the exact expected array.

### main.test.ts (lines 312-319)
Replace 7 `toContain` calls for `COMMANDS` with a single `toEqual` assertion.

### main.test.ts (lines 328-335)
Replace 7 `toContain` calls checking `HELP_TEXT` with a comprehensive assertion.

### init.test.ts (lines 31-36)
Replace 6 `toContain` calls for `fs.createdDirs` with `toEqual` containing the exact expected array.

### check.test.ts (lines 77-79)
Replace 3 `toContain` calls for commands array with `toEqual`.

### check.test.ts (lines 99-101)
Replace 3 `toContain` calls for stdout lines with `toEqual` or `toEqual(expect.arrayContaining(...))`.

### list.test.ts (lines 49-53)
Replace 4 `toContain` calls with a single comprehensive assertion.

### list.test.ts (lines 119-122)
Replace 4 `toContain` calls with a single comprehensive assertion.

### help.test.ts (lines 87-89)
Replace 3 `toContain` calls with a single comprehensive assertion.

## Goals

- [Comprehensive Assertions](../goals/comprehensive-assertions.md)

## Blocked by

(none)

## Definition of done

- [ ] All violations listed above are fixed
- [ ] Tests still pass after changes
- [ ] Each fix uses `toEqual` or similar comprehensive assertion instead of multiple partial assertions

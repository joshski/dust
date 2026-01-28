# Fix comprehensive assertion violations

Replace multiple partial assertions with single comprehensive assertions across all test files. Each fix should be ONE `toEqual` assertion with the exact expected value—not loops, not `expect.arrayContaining`, not multiple assertions.

## Violations to fix

### agent.test.ts (lines 168-175)

Replace:
```javascript
expect(AGENT_SUBCOMMANDS).toContain('new task')
expect(AGENT_SUBCOMMANDS).toContain('new goal')
// ... 5 more toContain calls
expect(AGENT_SUBCOMMANDS.length).toBe(7)
```

With:
```javascript
expect(AGENT_SUBCOMMANDS).toEqual([
  'new task',
  'new goal',
  'new idea',
  'implement task',
  'understand goals',
  'pick task',
  'help',
])
```

### main.test.ts (lines 312-319)

Replace 7 `toContain` calls for `COMMANDS` with:
```javascript
expect(COMMANDS).toEqual(['init', 'validate', 'list', 'next', 'check', 'agent', 'help'])
```

### init.test.ts (lines 31-36)

Replace 6 `toContain` calls for `fs.createdDirs` with:
```javascript
expect(fs.createdDirs).toEqual([
  '/project/.dust',
  '/project/.dust/goals',
  '/project/.dust/ideas',
  '/project/.dust/tasks',
  '/project/.dust/facts',
  '/project/.dust/config',
])
```

### check.test.ts (lines 77-79)

Replace 3 `toContain` calls for commands array. Note: order may vary due to parallel execution, so use `toHaveLength` plus a Set comparison:
```javascript
expect(commands).toHaveLength(3)
expect(new Set(commands)).toEqual(new Set(['npm run lint', 'npm test', 'npm run build']))
```

### check.test.ts (lines 99-101)

Replace 3 `toContain` calls for `ctx.stdoutLines`. Since output order is deterministic, assert on the exact array or use a snapshot.

## Violations that may not need fixing

The following violations involve checking that a string contains certain substrings. These are harder to replace with `toEqual` because the full string value is large or generated. Review these and fix only if a clean solution exists:

- **agent.test.ts (lines 37-43)**: 7 `toContain` calls checking stdout for agent commands
- **main.test.ts (lines 328-335)**: 7 `toContain` calls checking `HELP_TEXT` contains command names
- **list.test.ts (lines 49-53)**: 4 `toContain` calls checking output contains type headers
- **list.test.ts (lines 119-122)**: 4 `toContain` calls checking stderr contains valid types
- **help.test.ts (lines 87-89)**: 3 `toContain` calls checking help text contains certain words

## Goals

- [Comprehensive Assertions](../goals/comprehensive-assertions.md)

## Blocked by

(none)

## Definition of done

- [ ] All array-based violations are fixed with single `toEqual` assertions
- [ ] Tests still pass after changes
- [ ] No loops or `expect.arrayContaining` used as replacements

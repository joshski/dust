# Omit unnecessary .dust subdirectories in end to end tests

The e2e tests in `tests/e2e/` create `.dust` directory structures with all four subdirectories (`goals`, `ideas`, `tasks`, `facts`) even when tests only need one or two of them. This adds unnecessary noise to test fixtures.

For example, `list-tasks.test.ts` only needs `tasks` but currently creates empty `goals: {}`, `ideas: {}`, and `facts: {}` directories:

```typescript
fileSystemTree: {
  project: {
    '.dust': {
      goals: {},      // unnecessary
      ideas: {},      // unnecessary
      tasks: {
        'task-one.md': buildTask({ ... }),
      },
      facts: {},      // unnecessary
    },
  },
},
```

The `shell-emulator.ts` already provides a `defaultFileSystemTree` with all four empty subdirectories (lines 35-44), so tests should only specify directories they actually populate.

## Files to modify

- `tests/e2e/blocked-tasks.test.ts` - only needs `tasks`
- `tests/e2e/check-command.test.ts` - review which directories are needed
- `tests/e2e/discover-available-work.test.ts` - review which directories are needed
- `tests/e2e/edge-cases.test.ts` - review which directories are needed
- `tests/e2e/explore-goals.test.ts` - only needs `goals`
- `tests/e2e/init-command.test.ts` - review which directories are needed
- `tests/e2e/list-tasks.test.ts` - only needs `tasks`
- `tests/e2e/new-content.test.ts` - review which directories are needed
- `tests/e2e/pick-task.test.ts` - needs `tasks` and `goals` (where goals are referenced)

## Goals

- [Readable Test Data](../goals/readable-test-data.md)

## Blocked by

(none)

## Definition of done

- [ ] Each e2e test file specifies only the `.dust` subdirectories it actually uses
- [ ] Empty subdirectory placeholders (`goals: {}`, etc.) are removed from test fixtures
- [ ] All e2e tests pass after the changes

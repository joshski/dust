# Define More End-to-End Tests for Important Scenarios

Add comprehensive e2e tests to cover critical agent workflows that are not yet tested.

## Background

The `tests/e2e/` directory contains end-to-end tests that simulate multi-turn agent sessions using the `runSession()` helper. Current tests cover basic scenarios:
- `explore-goals.test.ts` - Agent lists goals to understand project direction
- `discover-available-work.test.ts` - Agent discovers tasks through `bin/dust next`
- `list-tasks.test.ts` - Agent lists tasks to see current work

Many important workflows remain untested, creating risk that regressions could go unnoticed.

## Test Infrastructure

Tests use:
- `tests/run-session.ts` - Helper that orchestrates multi-turn sessions
- `tests/agent-emulator.ts` - Simulates AI agent behavior with pattern-matching handlers
- `tests/shell-emulator.ts` - Executes dust commands in-memory with virtual file system

Pattern for e2e tests:
```typescript
test('descriptive scenario name', async () => {
  const session = await runSession({
    fileSystemTree: { /* nested structure mirroring file system */ },
    handlers: [
      { pattern: /regex to match/, getCommand: () => 'next command' },
      { pattern: /termination condition/, getCommand: () => null },
    ],
  })
  expect(session).toMatchObject({ turns: [/* expected sequence */] })
})
```

## Important Scenarios to Test

### Task Workflow Tests
1. **Pick task from backlog** - Agent runs `bin/dust pick task`, gets instructions for available task
2. **Handle blocked tasks** - Agent sees that a task is blocked by another and picks an unblocked one
3. **Implement task flow** - Agent runs `bin/dust implement task` and gets implementation instructions

### Content Creation Tests
4. **New task creation** - Agent creates a task via `bin/dust new task` flow
5. **New goal creation** - Agent creates a goal via `bin/dust new goal` flow
6. **New idea creation** - Agent creates an idea via `bin/dust new idea` flow

### Quality Gate Tests
7. **Check command passes** - Agent runs `bin/dust check` and sees success
8. **Check command fails** - Agent runs `bin/dust check` with failing checks

### Initialization Tests
9. **Initialize new repository** - `bin/dust init` creates proper directory structure

### Edge Case Tests
10. **Empty backlog** - Agent handles case with no tasks available
11. **No goals defined** - Agent handles missing goals gracefully
12. **Malformed markdown** - Agent handles lint errors in dust files

## Files to Create

Create new test files in `tests/e2e/`:
- `pick-task.test.ts` - Test picking tasks from backlog
- `blocked-tasks.test.ts` - Test handling of blocked tasks
- `new-content.test.ts` - Test creating tasks, goals, ideas
- `check-command.test.ts` - Test quality gate checks
- `init-command.test.ts` - Test repository initialization
- `edge-cases.test.ts` - Test error handling and edge cases

## Goals

- [Make Changes with Confidence](../goals/make-changes-with-confidence.md)
- [Readable Test Data](../goals/readable-test-data.md)

## Blocked by

(none)

## Definition of done

- [ ] `pick-task.test.ts` tests the pick task workflow
- [ ] `blocked-tasks.test.ts` tests blocked task handling
- [ ] `new-content.test.ts` tests creating new tasks, goals, and ideas
- [ ] `check-command.test.ts` tests the check command success/failure
- [ ] `init-command.test.ts` tests repository initialization
- [ ] `edge-cases.test.ts` tests empty backlog and other edge cases
- [ ] All new tests pass with `npm test`
- [ ] Tests follow the readable test data pattern (nested file system trees)

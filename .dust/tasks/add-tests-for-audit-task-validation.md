# Add Tests for Audit Task Validation

Add tests to ensure generated audit tasks pass lint validation.

Similar to the tests in `lib/workflow-tasks.test.ts` under the `generated tasks pass lint rules` describe block, add tests that verify each stock audit template produces a valid task file when created via `dust audit <name>`.

## Goals

- [Comprehensive Test Coverage](../goals/comprehensive-test-coverage.md)
- [Stop the Line](../goals/stop-the-line.md)

## Blocked By

(none)

## Definition of Done

- [ ] Tests in `lib/cli/commands/audit.test.ts` verify each stock audit produces a valid task
- [ ] Tests use the same `lintTaskFile` validation as `lib/workflow-tasks.test.ts`
- [ ] All tests pass with both Vitest and Bun runtimes

# Add tests for dust next command

Add comprehensive tests for the `dust next` command following the test patterns established by other CLI commands.

## Goals

- [Make Changes with Confidence](../goals/make-changes-with-confidence.md)
- [Fast Feedback](../goals/fast-feedback.md)

## Blocked by

(none)

## Definition of done

- `lib/cli/next.test.ts` exists with tests covering:
  - Error when `.dust` directory not found
  - Empty output when no tasks exist
  - Listing tasks with no blockers
  - Filtering out tasks with incomplete blockers
  - Including tasks whose blockers are all completed
  - Handling tasks with `(none)` in blocked by section
- All tests pass when running `bun test lib/cli/next.test.ts`

# Test createDefaultDependencies in loop command

Add test coverage for `createDefaultDependencies` in `lib/cli/commands/loop.ts` and remove the `/* c8 ignore start/stop */` coverage exclusion block.

The function creates default dependencies for the loop command:
- `spawn` - Node's child_process spawn
- `run` - Claude run function
- `sleep` - Simple Promise-based timeout

The sleep function can be tested with 0ms to verify it resolves without actually waiting.

## Goals

- [Make Changes with Confidence](../goals/make-changes-with-confidence.md)

## Blocked by

(none)

## Definition of done

- [ ] Add test that calls `createDefaultDependencies()` and verifies it returns the expected structure
- [ ] Test that the sleep function resolves (using 0ms to avoid actual delay)
- [ ] Remove the `/* c8 ignore start */` and `/* c8 ignore stop */` comments from the function
- [ ] All existing tests pass
- [ ] Coverage still passes (the function is now covered)

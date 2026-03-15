# Extract Bucket Worker Native Wrappers

Extract native wrapper functions from `lib/cli/commands/bucket-worker.ts` into a dedicated `lib/bucket/native-io.ts` module. This restores coverage tracking to bucket-worker.ts.

## Context

The `bucket-worker.ts` file is currently excluded from vitest coverage in `vitest.config.ts` because v8 cannot honor inline `/* v8 ignore */` comments for function-level metrics. Lines 185-328 contain native wrapper functions:

- `adaptWebSocket()` - Wraps native WebSocket into a testable interface
- `defaultCreateWebSocket()` - Creates WebSocket with auth headers
- `defaultSetupKeypress()` - Sets up stdin raw mode and data handling
- `defaultSetupSignals()` - Attaches SIGINT/SIGTERM handlers
- `defaultSetupResize()` - Listens to stdout resize events
- `defaultGetTerminalSize()` - Reads process.stdout columns/rows
- `defaultWriteStdout()` - Writes to stdout
- `createDefaultBucketDependencies()` - Assembles all wrappers

These are thin imperative shell functions that wrap Node.js/Bun native APIs. Moving them to a file-level excluded module allows `bucket-worker.ts` to regain coverage tracking while maintaining the existing dependency injection pattern.

## Approach

1. Create `lib/bucket/native-io.ts` containing all functions from the `/* v8 ignore start */` block
2. Add `/* v8 ignore start */` and `/* v8 ignore stop */` around the entire file contents
3. Update `bucket-worker.ts` to import from `native-io.ts`
4. Update `vitest.config.ts`:
   - Remove `lib/cli/commands/bucket-worker.ts` from exclude list
   - Add `lib/bucket/native-io.ts` to exclude list
5. Run `bin/dust check` to verify 100% coverage is maintained

This follows the existing pattern in `lib/bucket/auth-server.ts` which already separates native wrappers with the same v8 ignore comments.

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Unit Test Coverage](../principles/unit-test-coverage.md)
- [Decoupled Code](../principles/decoupled-code.md)

## Blocked By

(none)

## Definition of Done

- [ ] `lib/bucket/native-io.ts` exists with all native wrapper functions extracted
- [ ] `lib/cli/commands/bucket-worker.ts` imports `createDefaultBucketDependencies` from `native-io.ts`
- [ ] `vitest.config.ts` excludes `native-io.ts` instead of `bucket-worker.ts`
- [ ] `bin/dust check` passes with 100% coverage

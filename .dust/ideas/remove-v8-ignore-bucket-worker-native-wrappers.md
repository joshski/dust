# Remove v8 Ignore: Bucket Worker Native Wrappers

Remove the v8 coverage exclusion for native wrapper functions in `lib/cli/commands/bucket-worker.ts` by restructuring for testability.

## Current State

Lines 185-328 contain adapter functions excluded from coverage:

- `adaptWebSocket()` - Wraps native WebSocket into a testable interface
- `defaultCreateWebSocket()` - Creates WebSocket with auth headers
- `defaultSetupKeypress()` - Sets up stdin raw mode and data handling
- `defaultSetupSignals()` - Attaches SIGINT/SIGTERM handlers
- `defaultSetupResize()` - Listens to stdout resize events
- `defaultGetTerminalSize()` - Reads process.stdout columns/rows
- `defaultWriteStdout()` - Writes to stdout
- `createDefaultBucketDependencies()` - Assembles all wrappers

The entire file is excluded from vitest coverage due to v8's inability to honor inline `/* v8 ignore */` comments for function-level metrics.

## Why This Matters

The file exclusion in `vitest.config.ts` masks coverage gaps in the rest of `bucket-worker.ts`. Any testable logic added to this file will not be tracked.

## Restructuring Approach

Extract native wrappers to a dedicated module (e.g., `lib/bucket/native-io.ts`) that is file-level excluded. Keep `bucket-worker.ts` testable with injected dependencies.

This follows the existing pattern in `lib/bucket/auth-server.ts` which already separates native wrappers.

## Benefits

- `bucket-worker.ts` regains coverage tracking
- Native wrappers consolidated in one place
- Clearer separation between business logic and platform I/O
- Easier to stub in tests

## Open Questions

### Should the new module be named for its purpose or its exclusion status?

#### Option: Name by purpose (e.g., `native-io.ts`, `platform-adapters.ts`)

Descriptive naming explains what the module does, not why it exists. Future readers understand the intent.

#### Option: Name by exclusion (e.g., `uncovered-natives.ts`)

Makes the coverage exclusion explicit in the filename. May help prevent accidental additions of testable code.

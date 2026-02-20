# Consolidate auth server utilities

Move the duplicated `defaultCreateServer` and `defaultOpenBrowser` functions to a shared module to eliminate code duplication.

## Background

The `defaultCreateServer` and `defaultOpenBrowser` functions are duplicated in:
- `lib/cli/commands/bucket.ts` (lines 174-213)
- `lib/cli/commands/bucket-asset-upload.ts` (lines 73-111)

Both files contain nearly identical implementations. The `AuthDependencies` interface already provides a way to inject these functions, making consolidation straightforward.

## Implementation Details

### Create shared module

Create `lib/bucket/auth-server.ts` containing:
- `createLocalServer` (renamed from `defaultCreateServer`) - Creates a local HTTP server with a request handler
- `openBrowser` (renamed from `defaultOpenBrowser`) - Opens a URL in the system browser

Both functions should remain thin wrappers around native APIs and can keep the `/* v8 ignore */` comment in one location instead of two.

### Update consumers

Update both `bucket.ts` and `bucket-asset-upload.ts` to import from the new shared module instead of defining their own implementations.

### Interface considerations

The `AuthDependencies` interface in `bucket.ts` already defines the type signatures. Consider exporting the shared implementations alongside the interface to make the connection clearer.

## Principles

- [Reasonably DRY](../principles/reasonably-dry.md)
- [Dependency Injection](../principles/dependency-injection.md)
- [Comprehensive Test Coverage](../principles/comprehensive-test-coverage.md)

## Blocked By

(none)

## Definition of Done

- [ ] Shared `lib/bucket/auth-server.ts` module created
- [ ] `defaultCreateServer` and `defaultOpenBrowser` moved to shared module
- [ ] Both `bucket.ts` and `bucket-asset-upload.ts` import from shared module
- [ ] Coverage ignore blocks reduced from 2 to 1 for this code
- [ ] Existing tests continue to pass

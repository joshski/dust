# Refactor test env stubbing to avoid global state

Replace the module-level `originalEnvValues` Map in `lib/test/test-utilities.ts` with explicit state management to enable parallel test execution.

## Current State

The `stubEnv()` and `restoreEnv()` functions in `lib/test/test-utilities.ts:79-145` use a module-level Map to track original environment variable values:

```typescript
const originalEnvValues = new Map<string, string | undefined>()
```

This pattern has several issues:

1. **Test isolation** - If a test calls `stubEnv()` but crashes before `restoreEnv()`, the global Map retains stale state that affects subsequent tests
2. **Parallel execution** - Tests running concurrently may interfere with each other's environment stubbing
3. **Implicit coupling** - The global state creates hidden dependencies between test files

The callback form of `stubEnv(name, value, callback)` already avoids these issues by using local state. The problem is the two-call form `stubEnv()` / `restoreEnv()`.

## Related Issues

Several test files manually stub and restore `process.env` without using the shared utilities:
- `lib/cli/main.test.ts:359-380`
- `lib/loop/*.test.ts`
- `lib/cli/commands/bucket.test.ts:354-362,536-544`
- `lib/claude/spawn-claude-code.test.ts:541-590`

These follow inconsistent patterns (some use `delete`, some restore to `undefined`).

## Open Questions

### How should the stateful stubEnv/restoreEnv pattern be replaced?

#### Deprecate two-call form, require callback form only

Remove `stubEnv(name, value)` overload and keep only `stubEnv(name, value, callback)`. Force callers to scope environment changes to a callback, ensuring automatic cleanup. This is the simplest solution that fully eliminates global state.

Migration: Update all callers to use the callback form. Test frameworks already support async callbacks.

#### Return a restore function from stubEnv

Change the signature to `stubEnv(name, value): () => void` where the return value restores the original. Callers must capture and call the restore function. This keeps the two-call pattern but makes state explicit.

Migration: Update callers from `stubEnv(); ...; restoreEnv()` to `const restore = stubEnv(); ...; restore()`.

#### Create EnvEmulator class

Add an `EnvEmulator` to `lib/test/test-utilities.ts` that wraps `process.env` access. Each test creates its own instance. Aligns with existing emulator patterns (FileSystemEmulator, ContextEmulator).

Migration: Tests would instantiate `new EnvEmulator()` and pass it to code under test. Requires code changes to accept injected env objects.

#### Keep global Map but add afterEach cleanup hook

Document that tests using `stubEnv()` must call `restoreEnv()` in `afterEach`. This doesn't eliminate the global state but codifies the expected usage.

Downside: Doesn't address parallel execution concerns.

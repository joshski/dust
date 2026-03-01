# Remove globalThis.fetch assignment in tests

The only global assignment in the test suite is `globalThis.fetch` in `lib/bucket/auth.test.ts`. This occurs in 5 places across two test groups:

1. `describe('defaultExchangeCode')` - 3 assignments with manual cleanup in `afterEach`
2. `describe('authenticate')` - 1 assignment in the test for `defaultExchangeCode` fallback, with try/finally cleanup

## Current State

The `defaultExchangeCode` function in `lib/bucket/auth.ts:78-93` calls the global `fetch` directly:

```typescript
export async function defaultExchangeCode(code: string): Promise<string> {
  const host = getDustbucketHost()
  const response = await fetch(`${host}/auth/cli/exchange`, { ... })
  ...
}
```

Tests stub this by saving/restoring `globalThis.fetch`. While the tests do clean up properly, this pattern:
- Relies on manual cleanup discipline
- Could cause interference if cleanup fails (e.g., on test timeout)
- Contradicts the [Dependency Injection](../principles/dependency-injection.md) principle

## Proposed Solution

Make `fetch` injectable in `defaultExchangeCode`, defaulting to the global `fetch`:

```typescript
export async function defaultExchangeCode(
  code: string,
  fetchFn: typeof fetch = fetch
): Promise<string> {
  const host = getDustbucketHost()
  const response = await fetchFn(`${host}/auth/cli/exchange`, { ... })
  ...
}
```

Tests would then pass a stub function instead of mutating the global.

## Considerations

- This is a small, localized change affecting one file
- The `AuthDependencies` interface already supports `exchangeCode` injection, so the integration path is already clean
- The existing `more-emulators.md` idea proposes a broader FetchEmulator abstraction, but that may be over-engineering for this single use case

## Related

- [More emulators](more-emulators.md) - broader proposal for HTTP emulators
- [Dependency Injection](../principles/dependency-injection.md) - principle this change would align with
- [Stubs Over Mocks](../principles/stubs-over-mocks.md) - current tests already use stubs, just via global mutation

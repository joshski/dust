# Inject fetch in defaultExchangeCode

Make `fetch` injectable in `defaultExchangeCode` to eliminate the need for `globalThis.fetch` assignment in tests.

## Context

The `defaultExchangeCode` function in `lib/bucket/auth.ts` calls the global `fetch` directly. Tests in `lib/bucket/auth.test.ts` stub this by saving and restoring `globalThis.fetch`. While the tests do clean up properly, this pattern:
- Relies on manual cleanup discipline
- Could cause interference if cleanup fails (e.g., on test timeout)
- Contradicts the Dependency Injection principle

## Implementation

Add an optional `fetchFn` parameter to `defaultExchangeCode`, defaulting to the global `fetch`:

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

Update tests to pass a stub function instead of mutating `globalThis.fetch`.

## Principles

- [Dependency Injection](../principles/dependency-injection.md)
- [Test Isolation](../principles/test-isolation.md)
- [Stubs Over Mocks](../principles/stubs-over-mocks.md)

## Blocked By

(none)

## Definition of Done

- [ ] `defaultExchangeCode` accepts an optional `fetchFn` parameter
- [ ] Tests pass a stub function instead of assigning to `globalThis.fetch`
- [ ] No `globalThis.fetch` assignments remain in `lib/bucket/auth.test.ts`
- [ ] All tests pass
- [ ] `bin/dust check` passes

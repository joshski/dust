# Remove v8 ignore: Indirectly Tested Code

Refactor code that's currently tested indirectly to be testable directly, removing the need for v8 ignore comments.

## Locations

1. `lib/bucket/repository-loop.ts:315-318` - The createStdoutSink callback is marked as "tested via createBufferStdoutSink tests". Consider exposing it as a testable unit.

2. `lib/bucket/auth.ts:101-103` - The defaultExchangeCode fallback is "tested directly, not via authenticate". Consider restructuring so the authenticate function's dependency injection is fully covered.

## Approach

Apply [Dependency Injection](../principles/dependency-injection.md) more consistently:
- Extract callbacks to named, exported functions where appropriate
- Ensure all code paths through dependency-injected functions are covered by tests
- Remove v8 ignore comments once coverage is achieved

## Blocked By

(none)

## Definition of Done

- [ ] Indirectly tested code is restructured for direct testing
- [ ] v8 ignore comments are removed
- [ ] All tests pass
- [ ] Coverage remains at 100%

## Principles

- [Dependency Injection](../principles/dependency-injection.md)
- [Unit Test Coverage](../principles/unit-test-coverage.md)

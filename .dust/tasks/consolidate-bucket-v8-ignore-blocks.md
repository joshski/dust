# Consolidate bucket v8 ignore blocks

After extracting pure functions, consolidate the remaining `v8 ignore` blocks into a single thin wrapper section at the top of `bucket.ts`.

## Context

Once the pure function extractions are complete, the remaining `v8 ignore` blocks will be:
- Thin native wrappers (WebSocket, stdin, signals, resize, stdout)
- `createDefaultBucketDependencies` which assembles them

These can be consolidated into a clearly-marked "native wrappers" section, making the coverage exemptions obvious and minimal.

## Implementation

1. Review remaining `v8 ignore` blocks after previous tasks complete
2. Consolidate wrapper functions into a single block at the top of `bucket.ts`
3. Ensure no business logic remains inside ignored sections
4. Update `BucketDependencies` if any fields are no longer needed externally

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Unit Test Coverage](../principles/unit-test-coverage.md)

## Blocked By

(none)

## Definition of Done

- [ ] All `v8 ignore` blocks contain only thin native wrappers with no business logic
- [ ] Wrapper blocks are consolidated at the top of the file
- [ ] No new `v8 ignore` blocks are introduced during the refactor
- [ ] Total lines under `v8 ignore` is reduced compared to current state (~180 lines)
- [ ] All existing tests pass

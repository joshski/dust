# Reduce unsafe double casts in tests

The test suite uses `as unknown as` extensively to satisfy dependency interfaces. This weakens compile-time guarantees in tests and makes stubs harder to trust when interfaces change.

## Current State

### Double casts are widespread in test code

`rg "as unknown as" lib -g"*.test.ts"` returns 120 matches, including:
- Process and child-process stubs (`loop`, `check`, `bucket`, `pre-push`, `docker-agent` tests)
- Spawn/readline/fetch stubs (`claude`, `codex`, `bucket` tests)
- TTY manipulation (`lib/cli/colors.test.ts`)

### Production has almost none of this pattern

Only one non-test `as unknown as` cast currently exists (`lib/cli/commands/bucket.ts`, WebSocket wrapper). The bulk of the issue is test-side type safety.

### Existing principles already point to better patterns

`Stubs Over Mocks` and `Dependency Injection` both favor explicit, hand-rolled fakes with clear contracts. Many current tests already inject dependencies, but fallback to double casts when building partial stubs.

## Findings

### This should be a phased effort

Cleaning all 120 cases in one change is high-risk and likely to produce noisy diffs. A strategy by dependency category (fetch, spawn, timers, process streams) is more realistic.

### Shared typed test factories would pay off quickly

Repeated casting patterns suggest missing helpers. Typed factories for common dependencies could remove many casts while improving readability.

### Some casts may remain pragmatic

A small number of boundaries (for example native WebSocket interop) may still require assertions. The goal should be reduction and consistency, not absolute zero.

## Open Questions

### Should we enforce this with linting?

#### Add a lint rule for `as unknown as` in tests with scoped exceptions

Prevent new instances while migration is in progress. Allow explicit suppression comments for unavoidable interop.

#### Avoid lint enforcement until migration stabilizes

Rely on code review guidance first to avoid blocking contributors during early refactors.

### How should migration be sequenced?

#### Dependency-category rollout

Refactor one category at a time (`fetch`, then `spawn`, then `ChildProcess`, etc.) with shared helpers and focused test updates per category.

#### Command-by-command rollout

Refactor tests per command/module to keep ownership local, even if helper patterns emerge more slowly.

### Should the lone production double-cast be in scope?

#### Include `defaultCreateWebSocket` in this effort

Treat it as the same unsafe-cast class and replace it with a typed adapter or narrow interface wrapper.

#### Keep production cast out of scope

Limit this idea strictly to test ergonomics and handle production interop in a separate runtime-focused idea.

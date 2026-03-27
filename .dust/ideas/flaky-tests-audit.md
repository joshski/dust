# Flaky Tests Audit

Add a stock audit that identifies timing-dependent test assertions and suggests more deterministic approaches.

## Context

The codebase already has strong anti-flakiness infrastructure:

1. **Custom lint rule** (`lib/oxlint/plugins/no-fixed-sleep-in-tests.js`) - Flags `setTimeout(fn, delay)` and `sleep(delay)` with non-zero delays in test files
2. **Polling utility** (`waitFor()` in `lib/test-support/test-utilities.ts:333-352`) - Replaces fixed delays with condition polling
3. **Time emulator** (`lib/test-support/time-emulator.ts`) - Provides deterministic timer control for unit tests
4. **Integration test escape hatch** (`realSleep()` in `lib/test-support/test-utilities.ts:382-388`) - Explicitly allowed for system/integration tests

Despite these mechanisms, tests can still become flaky through:
- Race conditions in event-driven code
- Assumptions about event ordering without proper synchronization
- Timing assumptions hidden in test data setup
- Integration tests with real timing that could use emulators instead

## Proposed Audit

Add a stock audit named `flaky-tests` that reviews test files for timing-dependent patterns the lint rule can't catch.

### Scope

Focus on these areas:

1. **Event ordering assumptions** - Tests that assume events fire in a specific order without explicit synchronization
2. **Missing `waitFor()` usage** - Assertions on eventually-consistent state without polling
3. **Race conditions** - Multiple async operations where outcome depends on relative timing
4. **Integration tests with `realSleep()`** - Could these use `TimeEmulator` for faster, deterministic execution?
5. **Implicit timing dependencies** - Test setup that depends on microtask/macrotask queue ordering
6. **Process/subprocess tests** - Event emission timing in child process mocks

### Analysis Steps

#### 1. Event Ordering Review

For tests using event emitters (especially child process mocks):
1. Search for patterns like `proc.emit('data')` followed by immediate assertions
2. Check if events are scheduled with `setTimeout(..., 0)` for proper async emission
3. Verify tests wait for events (via promises or `waitFor()`) rather than assuming synchronous propagation
4. Flag tests asserting on event-driven state without synchronization

Example pattern to look for:
```typescript
// Potentially flaky
emitter.emit('event')
expect(state.changed).toBe(true) // May not have propagated yet

// More deterministic
setTimeout(() => emitter.emit('event'), 0)
await waitFor(() => expect(state.changed).toBe(true))
```

#### 2. `waitFor()` Opportunities

Search for patterns that could benefit from `waitFor()`:
1. Assertions on state modified by async operations
2. Polling with manual `while` loops and fixed `setTimeout()`
3. Comments mentioning "eventually" or "should become"
4. Integration test retries or manual delay logic

Flag cases where `waitFor()` would make timing explicit and remove race conditions.

#### 3. Race Condition Detection

Look for tests with multiple concurrent async operations:
1. Tests calling multiple promises without `Promise.all()` or ordering guarantees
2. State mutations from different async contexts without synchronization
3. Cleanup in `afterEach()` that might run before async operations complete

Flag tests where outcome depends on which operation finishes first.

#### 4. `realSleep()` Usage Review

For each `realSleep()` call in integration/system tests:
1. Check if the test truly needs wall-clock time (e.g., testing external service timeouts)
2. Consider if `TimeEmulator` could provide deterministic control instead
3. Evaluate if the sleep duration indicates arbitrary "wait for things to settle" logic

Flag integration tests that could be faster and more reliable with emulated time.

#### 5. Subprocess Test Patterns

Review tests using child process mocks (common pattern in `lib/loop/*.test.ts` and `lib/bucket/*.test.ts`):
1. Verify events are emitted asynchronously via `setTimeout(..., 0)`
2. Check that assertions wait for process completion
3. Look for race conditions between stdout/stderr events and exit events
4. Verify cleanup doesn't assume synchronous process termination

Example from codebase:
```typescript
// Good pattern (from lib/loop/iteration.test.ts)
function createMockChildProcess(exitCode = 0) {
  const proc = new EventEmitter()
  setTimeout(() => proc.emit('close', exitCode), 0)  // Async emission
  return asChildProcessStub(proc)
}
```

#### 6. Microtask Queue Dependencies

Search for tests relying on microtask/macrotask execution order:
1. Multiple `setTimeout(..., 0)` calls assuming specific ordering
2. Assertions between promise chains without `await`
3. Test setup with implicit ordering expectations

Flag tests where changing Node.js event loop behavior could break assumptions.

### Output Format

For each finding, create an idea file with:
- **Test file location** - Path and line numbers
- **Flakiness category** - Event ordering, race condition, timing assumption, etc.
- **Current pattern** - Code excerpt showing the timing dependency
- **Suggested approach** - Specific refactoring using `waitFor()`, `TimeEmulator`, or event synchronization
- **Example implementation** - Show before/after code when applicable

### Applicability

This audit applies to codebases with:
- Async operations (promises, callbacks, event emitters)
- Subprocess or child process testing
- Integration tests with external timing
- Event-driven architectures

If the codebase has no async tests or only trivial synchronous tests, document that finding and skip detailed analysis.

## Blocked By

(none)

## Definition of Done

- Reviewed test files for event ordering assumptions
- Identified assertions on eventually-consistent state without polling
- Found tests with race conditions between concurrent operations
- Evaluated `realSleep()` usage for emulator opportunities
- Checked subprocess tests for proper async event handling
- Assessed microtask queue ordering dependencies
- Created ideas for any flaky patterns identified
- No changes to files outside `.dust/`

## Related Work

**Existing infrastructure**:
- `lib/oxlint/plugins/no-fixed-sleep-in-tests.js` - Lint rule for fixed sleeps
- `lib/test-support/test-utilities.ts` - `waitFor()` and `realSleep()` utilities
- `lib/test-support/time-emulator.ts` - Deterministic time control
- Principle: `environment-independent-tests.md` - Tests must produce same result regardless of where they run
- Principle: `test-isolation.md` - Tests should not interfere with one another

**Similar audits**:
- `coverage-exclusions` - Reviews test-related code for improvement opportunities
- `audit-quality-audit` - Reviews custom audit quality (meta-audit pattern)

## Open Questions

### Should this audit run on system tests?

#### Option: Include system tests

System tests in `/system-tests/` intentionally test end-to-end workflows and may legitimately use `realSleep()` for external process coordination. Include them in the audit but apply different standards (e.g., flag arbitrary sleep durations but allow documented timing needs).

#### Option: Exclude system tests

Focus only on unit/integration tests in `lib/**/*.test.ts`. System tests are expected to have some timing dependencies and reviewing them may create noise. Skip `/system-tests/` entirely.

#### Option: Separate system test review

Create ideas for both approaches: one audit for unit/integration tests (stricter), one for system tests (pragmatic).

### Should the audit suggest specific `waitFor()` patterns?

#### Option: Prescriptive suggestions

For each finding, include exact code showing how to replace timing assumptions with `waitFor()`. More helpful but requires deeper analysis.

#### Option: General guidance

Point to existing `waitFor()` usage examples and let implementers adapt. Faster audit but may lead to inconsistent fixes.

### Should this become a lint rule?

#### Option: Extend lint rule for pattern detection

Add detection for common flaky patterns (e.g., immediate assertions after `emit()`) to the existing `no-fixed-sleep-in-tests` rule. Catches issues at development time. Challenging for semantic patterns beyond syntactic checks.

#### Option: Audit-only

Keep as audit for human/agent review. Lint rules are good for clear violations but flakiness often requires context and judgment.

#### Option: Hybrid approach

Lint rule for clear syntactic patterns (e.g., `emit()` followed by assertion on same line), audit for semantic review.

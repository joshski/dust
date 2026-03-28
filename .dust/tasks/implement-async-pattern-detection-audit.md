# Implement Async Pattern Detection Audit

Extend the `flaky-tests` stock audit to detect semantic timing issues. This includes event ordering assumptions, race conditions, missing synchronization, and subprocess timing problems.

## Context

This task extends the flaky tests audit beyond syntactic fixed-sleep detection to identify semantic async patterns that cause flakiness. These patterns require understanding code structure and control flow, not just keyword matching.

Industry research shows that while fixed sleeps cause ~50% of flakiness, the remaining issues stem from race conditions, event ordering assumptions, and missing synchronization. Detecting these patterns provides comprehensive coverage of async-related test flakiness.

This task builds on the fixed sleep detection infrastructure, adding more sophisticated analysis guidance for agents.

## What to Implement

### 1. Event Ordering Detection

Guide agents to search for tests that assume synchronous event propagation:

- `emitter.emit('event')` followed by immediate assertions on event-driven state
- Missing synchronization between event emission and state changes
- Tests that don't wait for events via promises or polling

Suggest deterministic alternatives:
- Promise-based waiting (wrapping events in promises)
- Polling-based waiting (if utilities exist in codebase)
- Framework-specific event handling patterns

### 2. Race Condition Detection

Guide agents to identify tests with multiple concurrent async operations:

- Tests calling multiple promises without `Promise.all()` or ordering guarantees
- State mutations from different async contexts without synchronization
- Cleanup in `afterEach()`/`afterAll()` that might run before async operations complete
- Shared state between tests without proper reset

Flag tests where outcome depends on which operation finishes first.

### 3. Missing Synchronization Detection

Search for assertions on eventually-consistent state:

- Assertions on state modified by async operations without awaiting
- Polling with manual `while` loops and fixed delays
- Comments mentioning "eventually" or "should become"
- Integration test retries or manual delay logic

Suggest condition-based waiting utilities (custom or from testing frameworks).

### 4. Subprocess/Child Process Tests

Review tests using child processes or spawned commands:

- Tests that don't wait for process completion (exit/close events)
- Race conditions between stdout/stderr events and exit events
- Cleanup that doesn't account for async process termination
- Improper async event handling

Suggest promise-based wrappers or event-to-promise utilities.

### 5. Framework-Specific Patterns (Framework-Agnostic Focus)

While remaining framework-agnostic per resolved decisions, guide agents to detect common cross-framework patterns:

- Missing awaits after reactive changes
- Improper async wrapper usage
- Hardcoded waits instead of selector/condition-based waiting

Focus on patterns that appear across frameworks rather than framework-specific APIs.

## Principles

- [Environment Independent Tests](../principles/environment-independent-tests.md)
- [Test Isolation](../principles/test-isolation.md)
- [Reproducible Checks](../principles/reproducible-checks.md)
- [Self Diagnosing Tests](../principles/self-diagnosing-tests.md)
- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)

## Implementation Notes

- Build on the fixed sleep detection infrastructure from the previous task
- This audit extends `lib/audits/stock-audits.ts` with additional pattern guidance
- Maintain framework-agnostic approach (aligned with resolved decision)
- Use severity levels: Critical for obvious race conditions, Warning for potential issues, Info for timing dependencies that may be intentional
- Group findings by test file (one idea per test file, per resolved decision)
- Adapt recommendations to utilities detected in the target codebase
- Detection should focus on general patterns observable through code structure analysis

## Definition of Done

- `flaky-tests` audit extended with event ordering detection guidance
- Race condition detection patterns added
- Missing synchronization detection guidance implemented
- Subprocess/child process test review patterns added
- Framework-agnostic async patterns covered
- Output creates idea files with severity levels and context-appropriate recommendations
- Tests validate the extended audit guidance
- Task file deleted after implementation
- Changes committed with message: "Implement Async Pattern Detection Audit"

## Blocked By

(none)

## Task Type

implement

# Implement Fixed Sleep Detection Audit

Add audit infrastructure and fixed-sleep pattern detection for the `flaky-tests` stock audit, enabling static detection of timing-dependent test code.

## Context

This task implements the foundation of the flaky tests audit by detecting the most straightforward category of test flakiness: hardcoded delays using `setTimeout()`, `sleep()`, or similar functions. This pattern is syntactically detectable and represents nearly 50% of async-related test flakiness according to industry research.

The audit will be implemented as a stock audit template in `lib/audits/stock-audits.ts`, following the pattern of existing audits like `data-access-review` and `coverage-exclusions`. The template guides agents to explore test files, identify fixed sleep patterns, and create ideas for remediation.

## What to Implement

### 1. Audit Template Structure

Add a new stock audit named `flaky-tests` to `lib/audits/stock-audits.ts`. The template should include:

- Introduction explaining the audit's purpose (detecting timing-dependent patterns that cause flaky tests)
- Instructions to search for fixed sleep patterns in test files
- Guidance on creating idea files for findings
- Adaptation logic to suggest codebase-specific utilities when available

### 2. Fixed Sleep Detection

The audit should guide agents to search for these patterns in test files:

- `setTimeout()` or `sleep()` calls with hardcoded durations
- Comments indicating timing dependencies (e.g., "wait for X ms", "give it time to settle")
- Retry logic with fixed delays between attempts

Detection should focus on test files (e.g., `**/*.test.ts`, `**/*.spec.ts`, or framework-specific patterns).

### 3. Output Format

Guide agents to create idea files for each test file containing fixed sleep patterns. Each idea should include:

- **Title**: e.g., "Flaky Test: Fixed Delays in Auth Service Tests"
- **Context**: Test file location, line numbers, code excerpts showing the timing dependency
- **Proposed solution**: Suggest condition-based waiting approaches, adapting to utilities available in the target codebase
- **Before/after examples** when applicable

### 4. Codebase Adaptation

The audit should detect and recommend existing utilities in the target codebase:

- Search for common polling utility names (`waitFor`, `waitUntil`, `poll`, `eventually`)
- Check for framework-specific helpers (e.g., Testing Library's `waitFor`, Jest's `waitFor`)
- If no utilities exist, suggest implementing simple polling helpers or promise-based patterns

## Principles

- [Environment Independent Tests](../principles/environment-independent-tests.md)
- [Test Isolation](../principles/test-isolation.md)
- [Reproducible Checks](../principles/reproducible-checks.md)
- [Fast Feedback Loops](../principles/fast-feedback-loops.md)
- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)

## Implementation Notes

- This audit should be **general-purpose** for downstream dust users running it in their own repositories
- Do not assume specific testing infrastructure - adapt to what's available in each codebase
- Follow patterns from existing stock audits in `lib/audits/stock-audits.ts`
- The audit template should provide clear, actionable guidance for agents to execute autonomously
- Consider grouping findings: one idea per test file (aligned with resolved decision)
- Use severity levels (aligned with resolved decision): Critical for obvious fixed sleeps, Warning for suspicious patterns

## Definition of Done

- `flaky-tests` stock audit added to `lib/audits/stock-audits.ts`
- Audit template guides detection of fixed sleep patterns in test files
- Output format creates well-structured idea files with actionable remediation
- Audit adapts recommendations to utilities available in target codebase
- Tests validate the audit template structure and guidance
- Task file deleted after implementation
- Changes committed with message: "Implement Fixed Sleep Detection Audit"

## Blocked By

(none)

## Task Type

implement

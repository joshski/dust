# Remove Redundant Performance Audits

Remove `performance-review` and `test-coverage` audits that are covered by more specialized alternatives.

## Context

The `performance-review` audit covers startup time, command latency, memory usage, build performance, and test speed. All of these are covered more precisely by dedicated audits:

- `feedback-loop-speed` — measures check/test execution times with structured output
- `slow-tests` — deep dives into individual test timing with root cause analysis
- `algorithms` — identifies algorithmic complexity bottlenecks
- `data-access-review` — covers data access performance patterns

The `test-coverage` audit ("identify untested code paths") is too generic to produce consistent results without running actual coverage tools. Its scope is better covered by:

- `test-pyramid` — structured analysis of test distribution by type and timing
- `coverage-exclusions` — reviews coverage configuration for removal opportunities

Both generic audits add breadth but no depth. Downstream projects running them alongside the specialized audits get redundant, lower-quality findings.

## Changes

1. Delete the `performanceReview` function from [`lib/audits/stock-audits.ts`](../../lib/audits/stock-audits.ts)
2. Remove `'performance-review'` from `stockAuditFunctions`
3. Delete the `testCoverage` function from [`lib/audits/stock-audits.ts`](../../lib/audits/stock-audits.ts)
4. Remove `'test-coverage'` from `stockAuditFunctions`

## Principles

- [Small Units](../principles/small-units.md) — Specialized audits are more effective than broad ones

## Blocked By

(none)

## Definition of Done

- [ ] `performanceReview` function is deleted
- [ ] `testCoverage` function is deleted
- [ ] Both entries removed from `stockAuditFunctions` record
- [ ] `bin/dust check` passes

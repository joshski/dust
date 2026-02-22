# Add Coverage Exclusions Audit

Add a stock audit that reviews coverage exclusions and identifies opportunities to remove them through refactoring.

## Context

Coverage exclusions (in `vitest.config.ts`) are sometimes necessary due to tooling limitations or hard-to-test code patterns. However, exclusions can mask test debt and reduce confidence in the codebase. An audit that periodically reviews these exclusions helps ensure they remain justified and identifies opportunities to eliminate them through decoupling or other refactoring.

The current project has coverage exclusions for:
- Files with v8 coverage tool limitations (anonymous functions in async callbacks)
- Entry point files that are difficult to unit test in isolation

## Implementation

Add a new function `coverageExclusions()` to `lib/audits/stock-audits.ts` that returns an audit template. The audit should:

1. Guide the agent to review coverage exclusion configuration
2. Evaluate whether each exclusion is still necessary
3. Identify opportunities to remove exclusions by improving code structure
4. Generate ideas for refactoring where decoupling could eliminate the need for exclusions

Register the new audit in the `stockAuditFunctions` record with the name `coverage-exclusions`.

## Principles

- [Decoupled Code](../principles/decoupled-code.md)
- [Unit Test Coverage](../principles/unit-test-coverage.md)
- [Comprehensive Test Coverage](../principles/comprehensive-test-coverage.md)
- [Make Changes with Confidence](../principles/make-changes-with-confidence.md)

## Blocked By

(none)

## Definition of Done

- [ ] New `coverageExclusions()` function added to `lib/audits/stock-audits.ts`
- [ ] Function returns audit template with appropriate scope and definition of done
- [ ] Audit registered in `stockAuditFunctions` record as `coverage-exclusions`
- [ ] Audit links to relevant principles (decoupled code, test coverage)
- [ ] `bin/dust check` passes

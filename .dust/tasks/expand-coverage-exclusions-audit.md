# Expand Coverage Exclusions Audit

Update the `coverage-exclusions` stock audit to include inline escape directives, test files, and a technology-agnostic approach.

## Background

The current `coverage-exclusions` audit focuses only on configuration-level exclusions in `vitest.config.ts`. This expansion makes it comprehensive by also including inline escape directives (comments that exclude code from coverage), scanning test files for exclusions, and being technology-agnostic so agents can apply it to any codebase.

## Design Decisions

From the original idea's resolved questions:

- **Technology agnostic**: The audit should not suggest looking for specific coverage tools or patterns (agents can figure this out based on the codebase)
- **Include tests**: Test files should be scanned for inline directives that may hide flaky or unclear test logic
- **Report all with labels**: Always report exclusions for visibility; use category labels to distinguish justified cases from potential debt

## Implementation

Modify the `coverageExclusions()` function in `lib/audits/stock-audits.ts` to:

1. **Expand scope** - Cover both config-level exclusions and inline escape directives
2. **Be technology agnostic** - Describe what to look for conceptually rather than naming specific tools
3. **Include test files** - Scope includes both runtime and test code
4. **Categorize findings** - Guide agents to categorize by justification (native wrapper, defensive guard, integration boundary, etc.)
5. **Label all findings** - Report all exclusions with justification quality labels rather than filtering

The audit template is pure text, so no changes to I/O code are needed.

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md) - The audit template is pure data; agents execute it
- [Decoupled Code](../principles/decoupled-code.md) - Exclusions may indicate coupling that prevents testing
- [Unit Test Coverage](../principles/unit-test-coverage.md) - Aim for complete coverage
- [Comprehensive Test Coverage](../principles/comprehensive-test-coverage.md) - Agents depend on test coverage
- [Make Changes with Confidence](../principles/make-changes-with-confidence.md) - Untested code reduces confidence

## Blocked By

(none)

## Definition of Done

- Updated `coverageExclusions()` in `lib/audits/stock-audits.ts` to include inline directives scope
- Audit is technology agnostic (no tool-specific patterns like "v8 ignore")
- Test files are included in scope
- Findings include justification category labels
- Existing tests pass (`bin/dust check`)

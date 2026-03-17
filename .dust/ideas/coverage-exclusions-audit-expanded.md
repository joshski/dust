# Coverage Exclusions Audit (Expanded)

Extend the existing `coverage-exclusions` stock audit to include both configuration-level exclusions and inline escape directives.

## Current State

The codebase has two types of coverage exclusions:

### Configuration-Level Exclusions

In `vitest.config.ts`:
- `lib/cli/run.ts` - CLI entry point
- `lib/version.ts` - generated version file
- `lib/test/**` - test utilities
- `lib/bucket/native-io.ts` - thin wrappers around native APIs (documented as workaround for v8 function-level metrics)

### Inline Escape Directives

In runtime code (`lib/**`, excluding tests):
- 50+ `/* v8 ignore start/stop */` comment blocks
- Highest concentration in `lib/cli/commands/bucket-worker.ts` (~30 occurrences)
- Additional concentrations in `lib/bucket/repository-loop.ts` (~10), `lib/bucket/repository.ts` (~8), `lib/proxy/claude-api-proxy.ts` (~6)

Common justifications for inline directives:
- Native function wrappers (e.g., `lib/bucket/native-io.ts`)
- Defensive guards for unreachable branches
- Integration-only code paths (Docker mode, real subprocesses)
- Error handling paths only exercised by system tests
- State machine transition guards

There are also `biome-ignore` lint directives, primarily for regex patterns that would trigger false-positive linting issues.

## Proposed Change

Modify the `coverage-exclusions` stock audit in `lib/audits/stock-audits.ts` to:

1. **Expand scope** to cover both config exclusions AND inline directives
2. **Inventory all exclusions** regardless of type
3. **Categorize by justification** (native wrapper, defensive guard, integration boundary, test utility)
4. **Assess removal opportunities** by identifying:
   - Stale directives no longer needed
   - Testable logic hidden behind exclusion directives
   - Clustered directives indicating refactoring opportunities

## Output per Finding

Each exclusion should be documented with:
- Location (file:line or config section)
- Exclusion type (config or inline)
- Category (native wrapper, defensive guard, integration boundary, etc.)
- Justification quality (strong/weak/missing)
- Recommendation (keep/remove/refactor)

## Relationship to Current Audit

The existing `coverage-exclusions` audit focuses only on `vitest.config.ts`. This expansion makes it comprehensive by including inline directives, providing a complete view of what's excluded from coverage.

## Principles

- [Decoupled Code](../principles/decoupled-code.md) - excluded code may indicate coupling that prevents testing
- [Unit Test Coverage](../principles/unit-test-coverage.md) - aim for complete coverage
- [Comprehensive Test Coverage](../principles/comprehensive-test-coverage.md) - agents depend on test coverage
- [Make Changes with Confidence](../principles/make-changes-with-confidence.md) - untested code reduces confidence

## Open Questions

### Should lint escape directives be included?

#### Option: Include lint escapes

Review `biome-ignore` (and similar) alongside coverage escapes, since both reduce check coverage and may indicate code that could be restructured.

#### Option: Coverage only

Focus solely on `v8 ignore` directives; lint escapes are a separate concern better suited to a dedicated lint-escapes audit.

### Should test files be scanned for inline directives?

#### Option: Runtime code only

Keep scope on production maintainability; test file escapes are less concerning.

#### Option: Include tests

Surface overused escapes in test code that may hide flaky or unclear test logic.

### How should justified exclusions be reported?

#### Option: Report all with labels

Always report for visibility; use category labels to distinguish justified cases from potential debt.

#### Option: Filter to weak cases

Only surface exclusions with weak or missing justification to reduce noise.

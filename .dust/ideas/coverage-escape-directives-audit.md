# Coverage Escape Directives Audit

Add a stock audit that reviews inline coverage and lint escape directives as testability and maintainability signals.

## Current State

A stock `coverage-exclusions` audit already exists, but it focuses on config-level coverage exclusions (for example `vitest.config.ts`), not inline directives.

Current state in runtime code (`lib/**`, excluding tests):
- 23 inline escape directives (`v8 ignore` / `biome-ignore`)
- Highest concentration in [`lib/bucket/terminal-ui.ts`](../../lib/bucket/terminal-ui.ts) (5) and [`lib/proxy/claude-api-proxy.ts`](../../lib/proxy/claude-api-proxy.ts) (4)
- Additional directives in `bucket`, `proxy`, and CLI integration boundaries

Many are justified wrappers around native or integration-only paths, but concentration can still indicate refactoring opportunities.

## Proposed Audit

Add a stock audit named `coverage-escape-directives` in [`lib/audits/stock-audits.ts`](../../lib/audits/stock-audits.ts).

Template focus:
1. Inventory all inline `v8 ignore` and `biome-ignore` usage
2. Categorize rationale (runtime wrapper, unreachable branch, regex lint workaround, integration boundary)
3. Flag clusters and stale directives no longer needed
4. Recommend decoupling/extraction when directives hide testable logic

Required output per finding:
- Location
- Directive category
- Justification quality (strong/weak/missing)
- Keep/remove/refactor recommendation

## Relationship to Existing Audits

- Complements `coverage-exclusions` by targeting inline escapes rather than config exclusions.
- Complements `test-coverage` by identifying potentially testable paths currently excluded.

## Open Questions

### Should justified integration wrappers still be reported?

#### Option: Report all with category labels

Always report for visibility; allow “accepted” outcomes for justified cases.

#### Option: Report only weak or clustered cases

Reduce noise by surfacing only likely debt.

### Should test files be included?

#### Option: Runtime code only

Keep scope on production maintainability and execution paths.

#### Option: Include tests

Catch overused test-level lint escapes that may hide flaky or unclear test logic.

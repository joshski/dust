# Single Responsibility Violations Audit

Add a stock audit that flags files and functions that combine multiple responsibilities.

## Current State

The existing `refactoring-opportunities` audit is commit-churn driven, but there is no dedicated audit for single-responsibility violations in current code shape.

Current examples:
- `lib/cli/commands/check.ts` has a 100+ line `check(...)` function (`228-332`) that mixes CLI argument interpretation, progress rendering, scheduling strategy, and result formatting.
- `lib/validation/index.ts` has `validatePatch(...)` (`60-205`) that combines patch overlay creation, directory scans, per-file validation, and principle graph validation.

These patterns reduce readability and increase change risk when touching adjacent concerns.

## Proposed Audit

Add a stock audit named `single-responsibility-violations` in `lib/audits/stock-audits.ts`.

Template focus:
1. Functions that orchestrate unrelated concerns (I/O, control flow, rendering, domain checks)
2. Files that contain mixed layers (parsing + execution + presentation)
3. High-parameter functions and “collector” functions that coordinate too many collaborators
4. Refactoring recommendations that preserve behavior while splitting seams

Required output per finding:
- Location (file + function)
- Responsibility split (what concerns are mixed)
- Severity (blocking, slowing, minor)
- Suggested extraction plan

## Relationship to Existing Audits

- Complements `refactoring-opportunities` (history-driven) with structure-driven analysis.
- Complements `global-state` by targeting function/module cohesion rather than hidden shared state.

## Open Questions

### What threshold should trigger a single-responsibility finding?

#### Option: Primary threshold by responsibility count

Flag when a function clearly combines 3+ distinct concerns, regardless of line count.

#### Option: Hybrid threshold

Require both 60+ lines and 2+ concerns to reduce noise.

### Should findings include only runtime code?

#### Option: Runtime code only

Focus on `lib/**` excluding test files for highest impact on maintainability.

#### Option: Include test helpers too

Audit `*.test.ts` and shared test utilities where orchestration bloat slows agent understanding.

# Design Patterns Audit

Add a stock audit that identifies refactoring opportunities to recognized design patterns, with trade-off analysis for each suggestion.

## Context

The codebase contains several partially-implemented design patterns and areas where formalized patterns could improve maintainability. An audit would help surface these opportunities systematically rather than discovering them ad-hoc during development.

Current patterns in use:
- **Registry Pattern** (strong) — command registry in `lib/cli/main.ts`
- **Repository Pattern** (partial) — `lib/artifacts/index.ts`, `lib/bucket/repository.ts`
- **Dependency Injection** (strong) — throughout the codebase via interfaces
- **Type-safe Events** (strong) — discriminated unions in `lib/loop/events.ts`

Patterns that could be formalized:
- Validator interface consistency (currently ad-hoc signatures)
- Command middleware/interceptors
- Configuration builder
- State machine for repository lifecycle

## Proposed Audit

Add a stock audit named `design-patterns` in `lib/audits/stock-audits.ts`.

Template focus:
1. Identify code that would benefit from a recognized pattern
2. Name the pattern and explain its applicability
3. Analyze trade-offs (complexity cost vs. maintainability benefit)
4. Suggest incremental migration path

Required output per finding:
- Location (file and line range)
- Current approach and its limitations
- Recommended pattern
- Trade-off analysis (pros and cons of applying the pattern)
- Migration complexity estimate (low/medium/high)

## Relationship to Existing Audits

- Complements `single-responsibility-violations` by suggesting structural solutions
- Complements `interface-bloat` by identifying decomposition patterns
- Complements `refactoring-opportunities` with pattern-specific recommendations

## Open Questions

### How should pattern applicability be determined?

#### Option: Code smell triggers

Flag patterns based on code smells (e.g., switch statements on type suggest Strategy, repeated object construction suggests Factory, inconsistent interfaces suggest formalization).

#### Option: Structural heuristics

Flag based on structural characteristics (e.g., functions with similar signatures but different implementations, large parameter objects, state with multiple transitions).

### Should the audit recommend Gang of Four patterns only, or include modern alternatives?

#### Option: Classic GoF patterns

Focus on well-known patterns (Factory, Strategy, Observer, Command, State, etc.) that are widely understood and documented.

#### Option: Include modern TypeScript patterns

Also recommend TypeScript-specific patterns (discriminated unions, branded types, builder patterns with fluent APIs, result types for error handling).

### What minimum benefit threshold should trigger a recommendation?

#### Option: Low threshold, user filters

Flag all pattern opportunities and let users decide relevance. More comprehensive but potentially noisy.

#### Option: High threshold, concrete benefits

Only flag when clear maintainability or testability benefits can be articulated. Less noise but may miss valuable opportunities.

# Design Patterns Audit

Add a stock audit that identifies refactoring opportunities to recognized design patterns, using code smell triggers to flag findings.

## Context

The codebase contains several partially-implemented design patterns and areas where formalized patterns could improve maintainability. This audit surfaces opportunities systematically using code smell triggers rather than structural heuristics.

The audit should be somewhat tech-stack agnostic but mention Gang of Four patterns where applicable (which may or may not apply depending on how object-oriented the codebase is). Use a low threshold for flagging patterns and let users filter relevance.

## Implementation

Add a `design-patterns` function to `lib/audits/stock-audits.ts` following the existing pattern:

1. Create a `designPatterns(): string` function returning a dedented audit template
2. Register it in `stockAuditFunctions` as `'design-patterns'`

The audit template should:

### Code Smell Triggers (Pattern Applicability)

Flag patterns based on code smells that suggest pattern opportunities:
- Switch statements on type suggest **Strategy** pattern
- Repeated object construction suggests **Factory** pattern
- Inconsistent interfaces suggest interface **formalization**
- Complex conditional creation logic suggests **Builder** pattern
- State with multiple transitions suggests **State** pattern
- Notification chains suggest **Observer** pattern

### Output Per Finding

Each finding should include:
- **Location** - File and line range
- **Code smell** - What triggered this recommendation
- **Recommended pattern** - The suggested design pattern (Gang of Four or alternative)
- **Trade-off analysis** - Pros and cons of applying the pattern
- **Migration complexity** - Low/medium/high estimate

### Tech-Stack Agnosticism

The audit should:
- Mention Gang of Four patterns by name where applicable
- Note when patterns may not apply (e.g., Strategy less relevant in functional codebases)
- Suggest modern alternatives where appropriate (e.g., discriminated unions instead of Visitor)

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md) - Preserve pure core and thin shell boundaries in recommendations
- [Make the Change Easy](../principles/make-the-change-easy.md) - Pattern adoption should simplify future changes
- [Decoupled Code](../principles/decoupled-code.md) - Patterns should reduce coupling, not add complexity
- [Design for Testability](../principles/design-for-testability.md) - Pattern recommendations should improve testability

## Blocked By

(none)

## Definition of Done

- [ ] `designPatterns()` function added to `lib/audits/stock-audits.ts`
- [ ] Function registered in `stockAuditFunctions` as `'design-patterns'`
- [ ] Audit template uses code smell triggers for pattern applicability
- [ ] Output format includes location, code smell, recommended pattern, trade-offs, and migration complexity
- [ ] Audit is tech-stack agnostic with Gang of Four pattern references
- [ ] `bin/dust check` passes

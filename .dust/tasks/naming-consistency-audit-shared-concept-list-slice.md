# Naming Consistency Audit: Shared Concept List Slice

Extend the `naming-consistency` stock audit with a second vertical slice.
Focus on repeated shared concept lists that drift in naming, ordering, or shape across modules.

Scope:
- Detect high-confidence inconsistencies for repeated concept sets (for example artifact directories like `principles`, `facts`, `ideas`, `tasks`)
- Require canonical set proposal and migration strategy when inconsistencies are found
- Keep changes additive to the `naming-consistency` audit without overlapping `ubiquitous-language` scope

Guardrails:
- High-confidence recommendations only
- Prefer low-churn standardization guidance over churn-only rename sweeps
- Preserve Functional Core, Imperative Shell boundaries (pure analysis/matching logic separated from IO shell)

## Principles

- [Consistent Naming](../principles/consistent-naming.md)
- [Naming Matters](../principles/naming-matters.md)
- [Reasonably DRY](../principles/reasonably-dry.md)
- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Small Units](../principles/small-units.md)

## Blocked By

- [Naming Consistency Audit: Factory/Constructor Slice](./naming-consistency-audit-factory-constructor-slice.md)

## Definition of Done

- [ ] `naming-consistency` audit covers shared concept list inconsistencies (naming/order/shape) in addition to factory/constructor checks
- [ ] Findings for concept-list issues include locations, inconsistent set, canonical proposal, and migration strategy
- [ ] Tests cover at least one positive and one negative example for concept-list consistency recommendations
- [ ] Existing audit behavior remains stable outside `naming-consistency` scope

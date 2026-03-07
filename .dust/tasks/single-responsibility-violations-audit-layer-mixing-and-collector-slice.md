# Single Responsibility Violations Audit: Layer Mixing and Collector Slice

Extend the `single-responsibility-violations` stock audit with a second vertical slice.
Focus on module-level layer mixing and collector-style orchestration hotspots.

Scope:
- Add guidance for files that mix layers (for example parsing + execution + presentation)
- Add guidance for collector functions coordinating too many collaborators/parameters even when line count is moderate
- Keep required finding output consistent: location (file + function where applicable), responsibility split, severity, and suggested extraction plan

Guardrails:
- Keep this slice additive to responsibility-count coverage and avoid overlap with churn-driven `refactoring-opportunities`
- Preserve Functional Core, Imperative Shell boundaries in recommendations (extract pure decision logic from imperative orchestration)
- High-confidence findings only; avoid broad “rewrite module” recommendations

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Decoupled Code](../principles/decoupled-code.md)
- [Small Units](../principles/small-units.md)
- [Make the Change Easy](../principles/make-the-change-easy.md)
- [Context-Optimised Code](../principles/context-optimised-code.md)

## Blocked By

- [Single Responsibility Violations Audit: Responsibility Count Slice](./single-responsibility-violations-audit-responsibility-count-slice.md)

## Definition of Done

- [ ] `single-responsibility-violations` audit covers module layer-mixing and collector-style function findings in addition to responsibility-count checks
- [ ] Findings for this slice include location, responsibility split, severity, and extraction plan
- [ ] Tests cover at least one positive and one negative case for layer-mixing and collector-function guidance
- [ ] Existing audit behavior remains stable outside `single-responsibility-violations` scope

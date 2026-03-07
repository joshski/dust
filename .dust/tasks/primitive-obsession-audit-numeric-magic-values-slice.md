# Primitive Obsession Audit: Numeric Magic Values Slice

Extend the `primitive-obsession` stock audit with a second vertical slice.
Focus on numeric magic values that should be expressed as named constants or domain wrappers.

Scope:
- Add numeric primitive-obsession guidance to the `primitive-obsession` audit prompt/contract
- Detect high-confidence numeric literals used as thresholds, limits, retries, or timing values where naming would improve domain clarity
- Require each numeric finding to include: location(s), numeric pattern, constant/type opportunity, and migration path

Guardrails:
- High-confidence recommendations only (exclude obvious local loop indices and trivial literals like `0`/`1` where no domain meaning exists)
- Preserve Functional Core, Imperative Shell boundaries (pure detection/recommendation logic separated from shell concerns)
- Keep this slice additive and avoid expanding scope into broad new-type invention

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Small Units](../principles/small-units.md)
- [Clarity Over Brevity](../principles/clarity-over-brevity.md)
- [Make Changes with Confidence](../principles/make-changes-with-confidence.md)

## Blocked By

- [Primitive Obsession Audit: Existing-Type Drift Slice](./primitive-obsession-audit-existing-type-drift-slice.md)

## Definition of Done

- [ ] `primitive-obsession` audit covers numeric magic value findings in addition to existing-type drift checks
- [ ] Numeric finding format requires: locations, numeric pattern, constant/type opportunity, and migration path
- [ ] Tests cover at least one positive and one negative numeric example for recommendation quality
- [ ] Existing audit behavior remains stable outside `primitive-obsession` scope

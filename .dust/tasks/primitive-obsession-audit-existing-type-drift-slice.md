# Primitive Obsession Audit: Existing-Type Drift Slice

Deliver the first end-to-end slice of a new stock audit named `primitive-obsession`.
Focus on high-confidence findings where domain types already exist but call sites still use free-form primitive literals.

Scope:
- Add `primitive-obsession` to stock audits in `lib/audits/stock-audits.ts`
- Prompt and guidance should prioritize existing-type drift for domain string concepts (for example artifact directory names bypassing `ArtifactType`)
- Require each finding to include: locations, primitive pattern, existing domain type opportunity, and incremental migration path
- Keep recommendation policy high-confidence only (avoid speculative introduction of entirely new types in this slice)

Guardrails:
- Preserve Functional Core, Imperative Shell boundaries by keeping matching/recommendation logic pure and IO in the audit shell
- Keep this slice narrowly scoped to string literal drift where a canonical type already exists

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Small Units](../principles/small-units.md)
- [Make the Change Easy](../principles/make-the-change-easy.md)
- [Naming Matters](../principles/naming-matters.md)

## Blocked By

(none)

## Definition of Done

- [ ] `primitive-obsession` exists as a stock audit and can be selected/run through the existing audit workflow
- [ ] Audit instructions are constrained to existing-type drift for domain string literals
- [ ] Finding format requires: locations, primitive pattern, existing type opportunity, and migration path
- [ ] Tests verify stock-audit registration and prompt contract for this slice end-to-end

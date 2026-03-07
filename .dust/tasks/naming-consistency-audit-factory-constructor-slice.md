# Naming Consistency Audit: Factory Constructor Slice

Deliver the first end-to-end slice of a new stock audit named `naming-consistency`.
Focus on high-confidence naming consistency for factory/constructor APIs.

Scope:
- Add `naming-consistency` to stock audits in `lib/audits/stock-audits.ts`
- Prompt and guidance should focus only on equivalent creation abstractions (`build*`, `create*`, `make*`, `new*`) where intent is clearly the same
- Require each finding to include locations, inconsistent term set, canonical name proposal, and migration strategy (incremental or one-shot)
- Keep recommendation policy high-confidence only (no speculative broad renames)

Out of scope for this slice:
- Canonical artifact-list ordering/shape checks
- Broad terminology drift already covered by `ubiquitous-language`

## Principles

- [Consistent Naming](../principles/consistent-naming.md)
- [Naming Matters](../principles/naming-matters.md)
- [Clarity Over Brevity](../principles/clarity-over-brevity.md)
- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Small Units](../principles/small-units.md)

## Blocked By

(none)

## Definition of Done

- [ ] `naming-consistency` exists as a stock audit and can be selected/run through the existing audit workflow
- [ ] Audit instructions constrain scope to high-confidence factory/constructor naming inconsistencies only
- [ ] Each finding format requires: locations, inconsistent term set, canonical proposal, and migration strategy
- [ ] Tests verify stock-audit registration and prompt contract for this slice end-to-end

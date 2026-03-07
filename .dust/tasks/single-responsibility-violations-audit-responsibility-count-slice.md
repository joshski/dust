# Single Responsibility Violations Audit: Responsibility Count Slice

Deliver the first end-to-end slice of a new stock audit named `single-responsibility-violations`.
Focus on high-confidence function-level findings driven by responsibility count.

Scope:
- Add `single-responsibility-violations` to stock audits in `lib/audits/stock-audits.ts`
- Prompt and guidance should flag functions that clearly combine 3+ distinct responsibilities
- Include both runtime code and test helpers in audit scope
- Require each finding to include: location (file + function), responsibility split, severity, and suggested extraction plan

Guardrails:
- Preserve Functional Core, Imperative Shell boundaries by keeping analysis/recommendation logic pure and IO concerns in the audit shell
- Keep recommendation policy high-confidence only (clear concern boundaries, not speculative style feedback)

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Decoupled Code](../principles/decoupled-code.md)
- [Small Units](../principles/small-units.md)
- [Make Changes with Confidence](../principles/make-changes-with-confidence.md)
- [Context-Optimised Code](../principles/context-optimised-code.md)

## Blocked By

(none)

## Definition of Done

- [ ] `single-responsibility-violations` exists as a stock audit and can be selected/run through the existing audit workflow
- [ ] Audit instructions enforce the primary threshold: 3+ distinct responsibilities per function
- [ ] Audit scope explicitly includes runtime code and test helpers
- [ ] Finding format requires: location, responsibility split, severity, and extraction plan
- [ ] Tests verify stock-audit registration and prompt contract for this slice end-to-end

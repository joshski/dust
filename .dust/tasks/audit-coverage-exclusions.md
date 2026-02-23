# Audit: Coverage Exclusions

Review coverage exclusion configuration to identify opportunities for removal through refactoring.

Review existing ideas in `./.dust/ideas/` to understand what has been proposed or considered historically, then create new idea files in `./.dust/ideas/` for any issues you identify, avoiding duplication.

## Scope

Focus on these areas:

1. **Current exclusions** - Review all exclusions in `vitest.config.ts` or equivalent
2. **Justification** - Is each exclusion still necessary?
3. **Tooling limitations** - Can workarounds be found for coverage tool issues?
4. **Decoupling opportunities** - Can excluded code be restructured to enable testing?
5. **Entry point patterns** - Can hard-to-test entry points be decoupled from logic?

## Principles

- [Decoupled Code](../principles/decoupled-code.md)
- [Unit Test Coverage](../principles/unit-test-coverage.md)
- [Comprehensive Test Coverage](../principles/comprehensive-test-coverage.md)
- [Make Changes with Confidence](../principles/make-changes-with-confidence.md)

## Blocked By

(none)

## Definition of Done

- [ ] Identified all coverage exclusions in the project
- [ ] Documented the reason each exclusion exists
- [ ] Evaluated whether each exclusion is still necessary
- [ ] Identified exclusions that could be removed through decoupling
- [ ] Proposed ideas for refactoring where feasible
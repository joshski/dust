# Add Applicability Guards to Artifact Audits

Add `## Applicability` sections to dust-artifact audits so they skip gracefully when the required directories don't exist.

## Context

These audits reference dust-specific directories that may not exist in newly adopted projects:

- `facts-verification` — `.dust/facts/`
- `stale-ideas` — `.dust/ideas/`
- `ideas-from-principles` — `.dust/principles/`
- `repository-context` — [`.dust/repository.md`](../repository.md)

Each should include an applicability section: "If `.dust/facts/` does not exist or is empty, document that finding and skip the detailed analysis."

This pattern already exists in `data-access-review` and `ux-audit`, which include similar guards for projects that don't have the relevant code patterns.

## Changes

Add `## Applicability` sections to these audit functions:

1. `factsVerification` — Guard for missing `.dust/facts/`
2. `staleIdeas` — Guard for missing `.dust/ideas/`
3. `ideasFromPrinciples` — Guard for missing `.dust/principles/`
4. `repositoryContext` — Guard for missing [`.dust/repository.md`](../repository.md)

Each guard should instruct the agent to document that the directory/file doesn't exist and skip the detailed analysis.

## Principles

- [Easy Adoption](../principles/easy-adoption.md) — Audits should work gracefully in projects that haven't fully adopted dust
- [Actionable Errors](../principles/actionable-errors.md) — Skip gracefully rather than producing noise

## Blocked By

(none)

## Definition of Done

- [ ] `factsVerification` has an Applicability section
- [ ] `staleIdeas` has an Applicability section
- [ ] `ideasFromPrinciples` has an Applicability section
- [ ] `repositoryContext` has an Applicability section
- [ ] Each guard follows the pattern from `data-access-review`
- [ ] `bin/dust check` passes

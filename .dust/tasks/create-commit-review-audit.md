# Create commit-review Audit

Merge `ideas-from-commits` into `refactoring-opportunities` and rename the combined audit to `commit-review`.

## Context

Both audits scan `git log` looking for improvement signals:

- `ideas-from-commits` looks for tech debt, TODOs, partial implementations, test gaps
- `refactoring-opportunities` looks for file churn, size growth, concerning commit message patterns

The commit message pattern analysis overlaps directly (both look for "fix", "workaround", "temporary", "hack", "TODO"). Merging them into a single audit that scans commits once and produces both refactoring and general improvement ideas eliminates the duplication.

The decision has been made to rename to `commit-review` — the broader name signals that the audit covers both refactoring signals and general improvement ideas from commits.

## Changes

1. Expand `refactoringOpportunities` to include the TODO/incomplete work/test gap checks from `ideasFromCommits`
2. Rename the function to `commitReview`
3. Update `stockAuditFunctions` to use `'commit-review': commitReview`
4. Delete the `ideasFromCommits` function
5. Remove `'ideas-from-commits'` from `stockAuditFunctions`

## Principles

- [Reasonably DRY](../principles/reasonably-dry.md) — Consolidating overlapping audits reduces redundancy
- [Small Units](../principles/small-units.md) — One audit for commit-based analysis is clearer than two overlapping ones

## Blocked By

(none)

## Definition of Done

- [ ] New `commitReview` function combines analysis from both audits
- [ ] `ideasFromCommits` function is deleted
- [ ] `stockAuditFunctions` contains `'commit-review'` instead of both previous entries
- [ ] `bin/dust check` passes

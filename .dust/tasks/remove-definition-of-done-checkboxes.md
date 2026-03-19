# Remove Definition of Done Checkboxes

Replace checkbox syntax (`- [ ]`) with plain list syntax (`-`) in all Definition of Done sections within audit templates.

## Context

Definition of Done sections describe completion criteria, not interactive to-do lists. Checkboxes imply items should be checked off as work progresses, but agents don't use them that way. Plain list items are semantically appropriate and match the majority of existing Definition of Done sections.

## Affected Files

Two source files contain checkboxes in Definition of Done sections:

- `lib/audits/stock-audits.ts` - 8 audit templates
- `lib/audits/checks-audit.ts` - 1 audit template

## Implementation

For each affected file, replace all `- [ ]` with `-` in Definition of Done sections. The change is mechanical find-and-replace within template strings.

## Out of Scope

The test file `lib/bucket/repository.test.ts` contains a checkbox in fixture data. This is intentional test data and should not be changed.

## Blocked By

(none)

## Principles

- [Small Units](../principles/small-units.md)
- [Atomic Commits](../principles/atomic-commits.md)
- [Repository Hygiene](../principles/repository-hygiene.md)

## Definition of Done

- All `- [ ]` patterns in Definition of Done sections are replaced with `-`
- Stock audit templates render with plain list items
- Test fixtures remain unchanged

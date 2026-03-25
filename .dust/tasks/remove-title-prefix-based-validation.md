# Remove title-prefix-based validation

Clean up validation code that enforced title prefix conventions, since task type is now derived from the `## Task Type` section.

This completes the migration by removing obsolete validation logic and making title prefixes purely cosmetic.

## Background

The validator in `lib/lint/validators/idea-validator.ts` currently validates that task titles match expected prefixes for workflow tasks. With content-based task type detection, these validations are no longer needed.

## Implementation

In `lib/lint/validators/idea-validator.ts`:

1. Remove or simplify `validateIdeaTransitionTitle()` since title prefixes are now optional
2. Remove `WORKFLOW_PREFIX_TO_SECTION` mapping since titles no longer need to match sections
3. Keep any validation that checks for the presence of required sections (like `Refines Idea`, `Decomposes Idea`), but remove validation that checks title prefixes

Update related tests to reflect that title prefixes are optional.

## Task Type

implement

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Boy Scout Rule](../principles/boy-scout-rule.md)
- [Lint Everything](../principles/lint-everything.md)

## Blocked By

- [Update commands to use Task Type section](./update-commands-to-use-task-type-section.md)

## Definition of Done

- Title prefix validation is removed or made optional
- Task type is validated via `## Task Type` section only
- Tests reflect that title prefixes are cosmetic
- `bin/dust check` passes

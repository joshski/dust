# Validate settings.json schema

Add strict schema validation for `.dust/config/settings.json` to catch configuration errors early.

## Background

An invalid `settings.json` currently causes silent fallback to defaults. Typos like `check` instead of `checks` go unnoticed until the feature doesn't work as expected.

Per the resolved questions in the original idea, validation should be strict and reject unknown keys.

## Implementation

1. Define the expected schema for settings.json with known keys: `dustCommand`, `checks`, `extraDirectories`
2. Add a function `validateSettingsJson` that:
   - Validates JSON is parseable
   - Rejects unknown top-level keys
   - Validates `checks` array entries have required `name` and `command` fields
   - Validates optional `hints` is an array of strings
   - Validates optional `timeoutMilliseconds` is a positive number
3. Call this validation from `lintMarkdown`
4. Report all schema violations, not just the first one

## Goals

- [Lint Everything](../goals/lint-everything.md)
- [Actionable Errors](../goals/actionable-errors.md)

## Blocked By

- [Rename lint markdown to lint](rename-lint-markdown-to-lint.md)

## Definition of Done

- [ ] `dust lint` validates settings.json is parseable JSON
- [ ] Unknown keys in settings.json cause violations
- [ ] Invalid `checks` entries (missing name/command) cause violations
- [ ] All schema violations are reported at once, not stopping at the first error
- [ ] All tests pass

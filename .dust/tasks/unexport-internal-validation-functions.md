# Unexport Internal Validation Functions

Remove the `export` keyword from three validation functions in `lib/config/settings.ts` that are only used internally.

The functions `validateChecksConfig`, `validateExtraDirectories`, and `validateDustEventsUrl` are exported but only called within `validateSettingsJson()`, which is the actual public API entry point. These should be internal implementation details.

## Blocked By

(none)

## Principles

- [Maintainable Codebase](../principles/maintainable-codebase.md)

## Definition of Done

- [ ] Remove `export` from `validateChecksConfig` (line 107)
- [ ] Remove `export` from `validateExtraDirectories` (line 123)
- [ ] Remove `export` from `validateDustEventsUrl` (line 141)
- [ ] `bin/dust check` passes

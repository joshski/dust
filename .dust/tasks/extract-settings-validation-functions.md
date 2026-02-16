# Extract settings validation functions

Split `validateSettingsJson()` in `lib/config/settings.ts` into per-key validator functions to reduce nesting depth.

## Goals

- [Small units](../goals/small-units.md)
- [Maintainable codebase](../goals/maintainable-codebase.md)
- [Decoupled code](../goals/decoupled-code.md)

## Blocked By

(none)

## Definition of Done

- [ ] Per-key validators extracted: `validateChecksConfig`, `validateExtraDirectories`, `validateDustEventsUrl`
- [ ] Top-level `validateSettingsJson` calls each validator
- [ ] No nesting deeper than 3 levels in any validator
- [ ] Existing tests pass without modification

# Unexport Internal Validation Functions

Remove the `export` keyword from three validation functions in `lib/config/settings.ts` that are only used internally.

Three validation functions in `lib/config/settings.ts` are exported but only used internally:

## Internal-Only Exports

1. `validateChecksConfig` (line 107)
2. `validateExtraDirectories` (line 123)
3. `validateDustEventsUrl` (line 141)

These functions are called by `validateSettingsJson()` which is the actual public API entry point.

## Proposed Fix

Remove the `export` keyword from these three functions since they are implementation details of `validateSettingsJson()`.

## Verification

Run `bin/dust check` after the change to ensure nothing breaks.

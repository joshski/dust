# Remove Unused Test Utilities Exports

Remove two exported symbols from `lib/test/test-utilities.ts` that are never imported anywhere.

Two exports in `lib/test/test-utilities.ts` are defined but never imported anywhere:

## Unused Exports

1. `testEnvironmentContext` (line 32) - Default environment context values for tests
2. `defaultTestSettings` (line 386) - Default settings object for tests

## Evidence

Running knip identifies these as unused exports. Manual verification with grep confirms no imports exist outside the defining file.

## Proposed Fix

Remove these unused exports from `lib/test/test-utilities.ts`. They appear to be leftover from refactoring or were added speculatively but never used.

## Verification

Run `bin/dust check` after removal to ensure no tests fail.

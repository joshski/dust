# Extract settings validation functions

`validateSettingsJson()` in `lib/config/settings.ts` is a single 165-line function with 5+ levels of nesting. Each settings key (`checks`, `extraDirectories`, `dustEventsUrl`) is validated inline with deeply nested conditionals and loops.

Extracting per-key validators would flatten the nesting and make each validation rule independently readable and testable:

- `validateChecksConfig(settings)` - validate the `checks` array
- `validateExtraDirectories(settings)` - validate the `extraDirectories` array
- `validateDustEventsUrl(settings)` - validate the URL string

The top-level function would become a short orchestrator calling each validator.

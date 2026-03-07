# Implement strict .dust root allowlist validation

Add path-level lint validation for `.dust/` root entries.
Reject non-allowlisted files and directories with deterministic, actionable errors.

## Principles

- [Lint Everything](../principles/lint-everything.md)
- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Actionable Errors](../principles/actionable-errors.md)
- [Small Units](../principles/small-units.md)

## Relevant Facts

- [Dust Directory Structure](../facts/dust-directory-structure.md)
- [Patch Validation](../facts/patch-validation.md)

## Blocked By

(none)

## Definition of Done

- [ ] `dust lint` fails when `.dust/` contains unknown root entries (both files and directories), with a deterministic list of allowed root paths in the message.
- [ ] Existing valid `.dust/` layouts continue to pass lint without requiring configuration changes.
- [ ] Unit tests cover at least one unexpected root file and one unexpected root directory case through CLI lint and patch validation paths.

# Render lint validation errors with relative paths

Display lint validation error file paths relative to cwd so command output is easier to scan and align with validation API behavior.

## Principles

- [Actionable Errors](../principles/actionable-errors.md)
- [Context Window Efficiency](../principles/context-window-efficiency.md)
- [Unsurprising UX](../principles/unsurprising-ux.md)

## Blocked By

- [Make validatePatch violation paths relative to cwd](./make-validatepatch-violation-paths-relative-to-cwd.md)

## Definition of Done

- [ ] `dust lint` validation-error output prints cwd-relative file paths for violations under the working directory
- [ ] Rendering falls back to absolute paths when relative conversion is not cleanly possible
- [ ] CLI tests verify both relative and fallback absolute display behavior without regressing existing lint output

# Make validatePatch violation paths relative to cwd

Return `ValidationResult.violations[].file` as cwd-relative paths so API consumers and downstream CLI output get shorter, consistent paths.

## Principles

- [Actionable Errors](../principles/actionable-errors.md)
- [Context Window Efficiency](../principles/context-window-efficiency.md)
- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)

## Blocked By

(none)

## Definition of Done

- [ ] `validatePatch` returns violation file paths relative to `context.cwd` (or `process.cwd()` when no cwd is provided)
- [ ] Path conversion logic is implemented as a pure helper with fallback to the original absolute path when a path cannot be cleanly relativized
- [ ] Validation API tests cover in-cwd paths and non-relativizable paths so behavior is explicit and stable

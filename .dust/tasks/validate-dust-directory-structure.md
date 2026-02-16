# Validate dust directory structure

Add validation to `dust lint` that rejects unexpected directories in `.dust/`.

## Background

A typo in a directory name (e.g., `.dust/task/` instead of `.dust/tasks/`) causes tasks to silently not be discovered. Validating the directory structure catches these issues early.

Per the resolved questions in the original idea, unexpected directories should be rejected by default but allowed via opt-in configuration.

## Implementation

1. Add a function `validateDirectoryStructure` in `lib/cli/commands/lint-markdown.ts` (or a new validation module)
2. Check that only expected directories exist at the `.dust/` root: `goals`, `ideas`, `tasks`, `facts`, `config`
3. Report violations for any unexpected directories
4. Add a `extraDirectories` setting in `settings.json` schema to allow users to opt-in extra directories
5. Call this validation from `lintMarkdown` alongside existing validations

## Goals

- [Lint Everything](../goals/lint-everything.md)
- [Actionable Errors](../goals/actionable-errors.md)

## Blocked By

(none)

## Definition of Done

- [ ] `dust lint` reports violations for unexpected directories in `.dust/`
- [ ] Users can opt-in extra directories via `extraDirectories` in settings.json
- [ ] Error messages explain what directories are allowed and how to configure exceptions
- [ ] All tests pass

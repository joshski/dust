# Validate content directory files

Add validation to `dust lint` that ensures only markdown files exist in content directories.

## Background

The content directories (`goals`, `ideas`, `tasks`, `facts`) should contain only `.md` files. Non-markdown files (like `.DS_Store`, backup files, or other artifacts) can cause unexpected behavior and clutter the directory.

## Implementation

1. Add a function `validateContentDirectoryFiles` that scans each content directory
2. Report violations for:
   - Non-markdown files (files not ending in `.md`)
   - Hidden files (files starting with `.`)
   - Subdirectories within content directories (they should be flat)
3. Call this validation from `lintMarkdown`

## Goals

- [Lint Everything](../goals/lint-everything.md)
- [Intuitive Directory Structure](../goals/intuitive-directory-structure.md)

## Blocked By

(none)

## Definition of Done

- [ ] `dust lint` reports violations for non-.md files in content directories
- [ ] Hidden files (like .DS_Store) are reported as violations
- [ ] Subdirectories within content directories are reported as violations
- [ ] All tests pass

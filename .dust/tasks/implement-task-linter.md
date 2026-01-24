# Implement Task Linter

Create a linter that validates Dust task files conform to the required structure.

The linter should be runnable from the command line and report any violations.

## Goals

- [Lightweight Planning](../goals/lightweight-planning.md)

## Blocked by

(none)

## Definition of done

A script or program exists that:
- Finds all markdown files in `.dust/tasks/`
- Validates each file contains the required headings: `## Goals`, `## Blocked by`, `## Definition of done`
- Validates all relative links in the file resolve to existing files
- Validates filenames use slug-style naming (alphanumeric and hyphens only)
- Exits with non-zero status if any violations are found
- Prints human-readable error messages for each violation

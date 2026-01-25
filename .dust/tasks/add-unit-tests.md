# Add Unit Tests

Add unit tests for existing scripts to establish a testing practice and enable confident refactoring.

## Goals

- [Fast Feedback](../goals/fast-feedback.md)
- [Small Units](../goals/small-units.md)
- [Make Changes with Confidence](../goals/make-changes-with-confidence.md)
- [Decoupled Code](../goals/decoupled-code.md)

## Blocked by

(none)

## Definition of done

- `scripts/lint-tasks.ts` is refactored for testability (dependency injection for file system access)
- Unit tests exist for `scripts/lint-tasks.ts` covering:
  - Filename validation (valid and invalid slug patterns)
  - Heading validation (missing and present headings)
  - Link validation (valid, broken, and external links)
- Tests run via `bun test`
- A `test` script is added to `package.json`

# Implement test errno error factory

Create a test utility for constructing typed errno errors. This eliminates repeated `as NodeJS.ErrnoException` assertions in test files and provides a consistent pattern for test error creation.

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md) - Separate code into a pure "functional core" and a thin "imperative shell."
- [Clarity Over Brevity](../principles/clarity-over-brevity.md) - Names should be descriptive and self-documenting, even if longer.
- [Design for Testability](../principles/design-for-testability.md) - Design code to be testable first; good structure follows naturally.
- [Readable Test Data](../principles/readable-test-data.md) - Test data setup should use natural structures that mirror what they represent.

## Guidance

### Functional Core, Imperative Shell

Separate code into a pure "functional core" and a thin "imperative shell." The core takes values in and returns values out, with no side effects. The shell handles I/O and wires things together.

Purely functional code makes some things easier to understand: because values don't change, you can call functions and know that only their return value matters—they don't change anything outside themselves.

The functional core contains business logic as pure functions that take values and return values. The imperative shell sits at the boundary, reading input, calling into the core, and performing side effects with the results. This keeps the majority of code easy to test (no mocks or stubs needed for pure functions) and makes the I/O surface area small and explicit.

### Clarity Over Brevity

Names should be descriptive and self-documenting, even if longer.

Abbreviated names like `ctx`, `deps`, `fs`, or `args` save a few keystrokes but obscure meaning. Full names like `context`, `dependencies`, `fileSystem`, and `arguments` make code immediately understandable without requiring readers to decode conventions. This is especially valuable when AI agents or new contributors read the codebase for the first time.

### Design for Testability

Design code to be testable first; good structure follows naturally.

Testability should be a primary design driver, not a quality to be retrofitted. When code is designed to be testable from the start, it naturally becomes decoupled, explicit in its dependencies, and clear in its interfaces.

The discipline of testability forces good design: functions become pure, dependencies become explicit, side effects become isolated. Rather than viewing testability as a tax on production code, recognize it as a compass that points toward better architecture.

This is particularly important in agent-driven development. Agents cannot manually verify their changes—they rely entirely on tests. Code that resists testing resists autonomous modification.

### Readable Test Data

Test data setup should use natural structures that mirror what they represent.

Test data should be immediately understandable without needing to trace through helper functions or understand framework conventions. Use simple, inline structures that look like the real data they represent. This makes test intent obvious at a glance and failures easier to diagnose.

## Current State

Test files construct errno errors with manual casting:
```typescript
const enoentError = new Error('ENOENT: no such file')
;(enoentError as NodeJS.ErrnoException).code = 'ENOENT'
```

This pattern appears in test files across `lib/validation/`, `lib/git/`, and other modules. It's verbose and easy to forget the proper error message format.

## Implementation

Add a factory function to `lib/test-support/test-utilities.ts`:

```typescript
/**
 * Creates a typed errno error for use in tests.
 *
 * @param code - The errno code (e.g., 'ENOENT', 'EEXIST', 'EACCES')
 * @param message - Optional custom message. If not provided, uses a standard format.
 * @returns A properly typed NodeJS.ErrnoException
 */
export function createErrnoError(
  code: string,
  message?: string
): NodeJS.ErrnoException {
  const error = new Error(message || `${code}: error`) as NodeJS.ErrnoException
  error.code = code
  return error
}
```

This helper is pure: it takes values (code and optional message) and returns a constructed error object with no side effects.

## Example Usage

After implementation, tests should use:
```typescript
const enoentError = createErrnoError('ENOENT', 'ENOENT: no such file')
```

Or with default message:
```typescript
const enoentError = createErrnoError('ENOENT')
```

This task only creates the helper with tests. Updating existing test files to use it will be a separate task.

## Task Type

implement

## Blocked By

(none)

## Definition of Done

- `createErrnoError` function is implemented in `lib/test-support/test-utilities.ts`
- Function is exported from the module
- Unit tests verify error object has correct `code` property
- Unit tests verify custom and default messages work correctly
- Unit tests verify returned type is properly typed as `NodeJS.ErrnoException`
- `bin/dust check` passes

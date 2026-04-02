# Implement filesystem error type guards

Create centralized type guards and helpers for narrowing filesystem error codes. This establishes a shared API for checking `ENOENT` and `EEXIST` errors without repeated `as NodeJS.ErrnoException` assertions.

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md) - Separate code into a pure "functional core" and a thin "imperative shell."
- [Decoupled Code](../principles/decoupled-code.md) - Code should be organized into independent units with explicit dependencies.
- [Clarity Over Brevity](../principles/clarity-over-brevity.md) - Names should be descriptive and self-documenting, even if longer.
- [Reasonably DRY](../principles/reasonably-dry.md) - Don't repeat yourself is a good principle, but don't overdo it.
- [Design for Testability](../principles/design-for-testability.md) - Design code to be testable first; good structure follows naturally.

## Guidance

### Functional Core, Imperative Shell

Separate code into a pure "functional core" and a thin "imperative shell." The core takes values in and returns values out, with no side effects. The shell handles I/O and wires things together.

Purely functional code makes some things easier to understand: because values don't change, you can call functions and know that only their return value matters—they don't change anything outside themselves.

The functional core contains business logic as pure functions that take values and return values. The imperative shell sits at the boundary, reading input, calling into the core, and performing side effects with the results. This keeps the majority of code easy to test (no mocks or stubs needed for pure functions) and makes the I/O surface area small and explicit.

### Decoupled Code

Code should be organized into independent units with explicit dependencies.

Decoupled code is easier to test, understand, and modify. Dependencies are passed in rather than hard-coded, enabling units to be tested in isolation and composed flexibly. This reduces the blast radius of changes and makes the system more maintainable.

### Clarity Over Brevity

Names should be descriptive and self-documenting, even if longer.

Abbreviated names like `ctx`, `deps`, `fs`, or `args` save a few keystrokes but obscure meaning. Full names like `context`, `dependencies`, `fileSystem`, and `arguments` make code immediately understandable without requiring readers to decode conventions. This is especially valuable when AI agents or new contributors read the codebase for the first time.

### Reasonably DRY

Don't repeat yourself is a good principle, but don't overdo it.

Extracting shared code too eagerly can create tight coupling, obscure intent, and make changes harder. When two pieces of code look similar but serve different purposes or are likely to evolve independently, duplication is the better choice. The cost of a wrong abstraction is higher than the cost of a little repetition. Extract shared code when the duplication is truly about the same concept and has proven stable, not just because two things happen to look alike right now.

### Design for Testability

Design code to be testable first; good structure follows naturally.

Testability should be a primary design driver, not a quality to be retrofitted. When code is designed to be testable from the start, it naturally becomes decoupled, explicit in its dependencies, and clear in its interfaces.

The discipline of testability forces good design: functions become pure, dependencies become explicit, side effects become isolated. Rather than viewing testability as a tax on production code, recognize it as a compass that points toward better architecture.

This is particularly important in agent-driven development. Agents cannot manually verify their changes—they rely entirely on tests. Code that resists testing resists autonomous modification.

## Current State

Error-code checks for `ENOENT` and `EEXIST` appear 28 times in production code via repeated `as NodeJS.ErrnoException` assertions. These checks are scattered across:
- `lib/cli/commands/lint-markdown.ts`
- `lib/cli/commands/init.ts`
- `lib/git/hooks.ts`
- `lib/config/settings.ts`
- `lib/validation/index.ts`
- And other modules

The typical pattern is:
```typescript
try {
  // filesystem operation
} catch (error) {
  if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
    // handle missing file
  }
  throw error
}
```

## Implementation

Create a new module `lib/filesystem/error-codes.ts` with:

1. **Type guard**: `isErrnoException(error: unknown): error is NodeJS.ErrnoException`
   - Returns `true` if error has a `code` property
   - Provides type narrowing for subsequent code checks

2. **Code-specific predicate**: `isErrorCode(error: unknown, code: string): boolean`
   - Combines type guard with code comparison
   - Returns `true` only if error is an errno exception with the specified code
   - Handles both the type narrowing and code check in one call

These helpers form the pure functional core for error code checking. They take values (error objects and code strings) and return boolean results with no side effects.

## Example Usage

After implementation, call sites should use:
```typescript
try {
  // filesystem operation
} catch (error) {
  if (isErrorCode(error, 'ENOENT')) {
    // handle missing file
  }
  throw error
}
```

This task only creates the helpers with full test coverage. Updating existing call sites will be a separate task.

## Task Type

implement

## Blocked By

(none)

## Definition of Done

- New module `lib/filesystem/error-codes.ts` exists
- `isErrnoException` function is implemented and exported
- `isErrorCode` function is implemented and exported
- Full unit test coverage in `lib/filesystem/error-codes.test.ts`
- Tests cover both success cases and edge cases (null, undefined, wrong types, etc.)
- `bin/dust check` passes

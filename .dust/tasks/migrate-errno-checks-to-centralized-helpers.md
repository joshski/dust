# Migrate errno checks to centralized helpers

Replace inline `as NodeJS.ErrnoException` assertions with centralized error-checking helpers across production code. This improves consistency and makes error-handling intent more explicit.

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md) - Separate code into a pure "functional core" and a thin "imperative shell."
- [Clarity Over Brevity](../principles/clarity-over-brevity.md) - Names should be descriptive and self-documenting, even if longer.
- [Reasonably DRY](../principles/reasonably-dry.md) - Don't repeat yourself is a good principle, but don't overdo it.

## Guidance

### Functional Core, Imperative Shell

Separate code into a pure "functional core" and a thin "imperative shell." The core takes values in and returns values out, with no side effects. The shell handles I/O and wires things together.

Purely functional code makes some things easier to understand: because values don't change, you can call functions and know that only their return value matters—they don't change anything outside themselves.

The functional core contains business logic as pure functions that take values and return values. The imperative shell sits at the boundary, reading input, calling into the core, and performing side effects with the results. This keeps the majority of code easy to test (no mocks or stubs needed for pure functions) and makes the I/O surface area small and explicit.

### Clarity Over Brevity

Names should be descriptive and self-documenting, even if longer.

Abbreviated names like `ctx`, `deps`, `fs`, or `args` save a few keystrokes but obscure meaning. Full names like `context`, `dependencies`, `fileSystem`, and `arguments` make code immediately understandable without requiring readers to decode conventions. This is especially valuable when AI agents or new contributors read the codebase for the first time.

### Reasonably DRY

Don't repeat yourself is a good principle, but don't overdo it.

Extracting shared code too eagerly can create tight coupling, obscure intent, and make changes harder. When two pieces of code look similar but serve different purposes or are likely to evolve independently, duplication is the better choice. The cost of a wrong abstraction is higher than the cost of a little repetition. Extract shared code when the duplication is truly about the same concept and has proven stable, not just because two things happen to look alike right now.

## Current State

Production code contains 28 instances of `(error as NodeJS.ErrnoException).code` checks for `ENOENT` and `EEXIST`. These appear in:
- `lib/validation/validation-pipeline.ts` (6 instances)
- `lib/validation/overlay-filesystem.ts` (2 instances)
- `lib/git/hooks.ts` (4 instances)
- `lib/patch/index.ts` (3 instances)
- `lib/config/settings.ts` (1 instance)
- `lib/bucket/auth.ts` (2 instances)
- `lib/cli/commands/migrate.ts` (1 instance)
- `lib/cli/commands/lint-markdown.ts` (1 instance)
- `lib/cli/commands/init.ts` (4 instances)
- `lib/filesystem/emulator.ts` (3 instances)
- `lib/lint/validators/directory-validator.ts` (3 instances)
- `lib/cli/shared/agent-shared.ts` (1 instance)

## Implementation

Replace all instances of:
```typescript
if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
  // ...
}
```

With:
```typescript
if (isErrorCode(error, 'ENOENT')) {
  // ...
}
```

And replace instances of:
```typescript
if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
  // ...
}
```

With:
```typescript
if (!isErrorCode(error, 'ENOENT')) {
  // ...
}
```

For code that creates errno errors (like in `lib/filesystem/emulator.ts` and `lib/validation/overlay-filesystem.ts`), the pattern can remain as-is since those are intentionally constructing error objects, not narrowing caught errors.

Add `import { isErrorCode } from '../filesystem/error-codes.js'` (or appropriate relative path) to each modified file.

## Task Type

implement

## Blocked By

(none)

## Definition of Done

- All 28 instances of `(error as NodeJS.ErrnoException).code === '...'` in production code are replaced with `isErrorCode(error, '...')`
- All negative checks (`!==`) are replaced with `!isErrorCode(error, '...')`
- Error construction code (in emulator and overlay-filesystem) remains unchanged
- Each modified file imports `isErrorCode` from `lib/filesystem/error-codes.js`
- All existing tests pass
- `bin/dust check` passes

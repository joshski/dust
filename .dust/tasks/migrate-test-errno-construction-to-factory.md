# Migrate test errno construction to factory

Replace manual errno error construction in tests with the centralized factory helper. This reduces test boilerplate and ensures consistent error creation patterns.

## Principles

- [Readable Test Data](../principles/readable-test-data.md) - Test data setup should use natural structures that mirror what they represent.
- [Reasonably DRY](../principles/reasonably-dry.md) - Don't repeat yourself is a good principle, but don't overdo it.
- [Clarity Over Brevity](../principles/clarity-over-brevity.md) - Names should be descriptive and self-documenting, even if longer.

## Guidance

### Readable Test Data

Test data setup should use natural structures that mirror what they represent.

Test data should be immediately understandable without needing to trace through helper functions or understand framework conventions. Use simple, inline structures that look like the real data they represent. This makes test intent obvious at a glance and failures easier to diagnose.

### Reasonably DRY

Don't repeat yourself is a good principle, but don't overdo it.

Extracting shared code too eagerly can create tight coupling, obscure intent, and make changes harder. When two pieces of code look similar but serve different purposes or are likely to evolve independently, duplication is the better choice. The cost of a wrong abstraction is higher than the cost of a little repetition. Extract shared code when the duplication is truly about the same concept and has proven stable, not just because two things happen to look alike right now.

### Clarity Over Brevity

Names should be descriptive and self-documenting, even if longer.

Abbreviated names like `ctx`, `deps`, `fs`, or `args` save a few keystrokes but obscure meaning. Full names like `context`, `dependencies`, `fileSystem`, and `arguments` make code immediately understandable without requiring readers to decode conventions. This is especially valuable when AI agents or new contributors read the codebase for the first time.

## Current State

Test files construct errno errors with manual casting:
```typescript
const enoentError = new Error('ENOENT: no such file')
;(enoentError as NodeJS.ErrnoException).code = 'ENOENT'
```

This pattern appears in test files including:
- `lib/validation/validation.test.ts`
- `lib/validation/overlay-filesystem.test.ts`
- `lib/validation/validation-pipeline.test.ts`

## Implementation

Replace all test instances of manual error construction:
```typescript
const permissionError = new Error('EACCES: permission denied')
;(permissionError as NodeJS.ErrnoException).code = 'EACCES'
```

With factory calls:
```typescript
const permissionError = createErrnoError('EACCES', 'EACCES: permission denied')
```

Add `import { createErrnoError } from '../test-support/test-utilities.js'` (or appropriate relative path) to each modified test file.

## Task Type

implement

## Blocked By

(none)

## Definition of Done

- All manual errno error construction in test files is replaced with `createErrnoError()` calls
- Each modified test file imports `createErrnoError` from `lib/test-support/test-utilities.js`
- All tests pass
- `bin/dust check` passes

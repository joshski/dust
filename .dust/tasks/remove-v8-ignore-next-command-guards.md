# Remove v8 Ignore: Next Command Guards

Refactor `findUnblockedTasks()` in `lib/cli/commands/next.ts` to eliminate unreachable code paths that require v8 coverage exclusions.

## Current State

Three v8 ignore exclusions exist for guards that are semantically unreachable:

1. `extractBlockedBy()` null guard (lines 34-38): The function is only called on files that passed `hasRequiredHeadings()`, so the regex match always succeeds
2. Two `taskContents.get(file) ?? ''` guards (lines 124, 143): The Map is populated from the same `mdFiles` array being iterated, so `.get()` always returns a value

## Approach

Restructure the code so guards become unnecessary by threading data through a typed intermediate structure:

```typescript
interface TaskFile {
  file: string
  content: string
}
```

Build `TaskFile[]` directly instead of a `Map<string, string>`, eliminating the need for `.get()` calls with nullish coalescing. This makes the correlation between files and contents explicit in the type system.

For `extractBlockedBy()`, since it's only called on validated content, either:
- Inline the extraction into the pipeline where validation already occurred
- Pass the pre-validated match result rather than re-parsing

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)

## Blocked By

(none)

## Definition of Done

- [ ] All v8 ignore comments are removed from `lib/cli/commands/next.ts`
- [ ] 100% test coverage is maintained without exclusions
- [ ] All existing tests pass
- [ ] `bin/dust check` passes

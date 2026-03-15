# Remove v8 Ignore: Next Command Guards

Remove the v8 coverage exclusions in `lib/cli/commands/next.ts` by eliminating defensive guards that can't be reached.

## Current State

Three exclusions exist for defensive null guards:

**Lines 34-38** - `extractBlockedBy()` function:
```typescript
/* v8 ignore start -- only called on valid tasks that always have ## Blocked By */
if (!blockedByMatch) {
  return []
}
/* v8 ignore stop */
```

**Lines 124, 143** - Map.get with nullish coalescing:
```typescript
const content =
  /* v8 ignore start */ taskContents.get(file) ?? '' /* v8 ignore stop */
```

## Why This Matters

These exclusions indicate code paths that "can't happen" but exist to satisfy TypeScript. The guards are syntactically required but semantically unreachable.

## Analysis

### `extractBlockedBy()` guard

The function is only called on files that passed `hasRequiredHeadings()`, which checks for `## Blocked By`. The regex match should always succeed. Options:

1. **Assert instead of guard**: Replace with assertion that throws, making the impossible explicit
2. **Return type narrowing**: Refactor `hasRequiredHeadings()` to return parsed sections, eliminating the regex reparse
3. **Accept the guard**: Keep the defensive code for robustness

### Map.get guards

The Map is populated from the same `mdFiles` array being iterated. The `.get()` will always return a value. Options:

1. **Use `!` non-null assertion**: TypeScript escape hatch, removes runtime guard
2. **Restructure loop**: Use Map entries or alternative data structure
3. **Keep with exclusion**: Accept that TypeScript's type system doesn't track this correlation

## Restructuring Approach

**Refactor `findUnblockedTasks()` to use a typed intermediate:**

```typescript
interface ParsedTask {
  file: string
  content: string
  headings: ParsedHeadings // from hasRequiredHeadings
}

const parsedTasks: ParsedTask[] = mdFiles
  .map(file => ({ file, content: taskContents.get(file)! }))
  .filter(t => hasRequiredHeadings(t.content))
  .map(t => ({ ...t, headings: parseHeadings(t.content) }))
```

This removes the Map lookups in the iteration loops.

## Benefits

- Removes unreachable code paths
- Makes impossible states unrepresentable
- Simplifies control flow

## Open Questions

### Should impossible guards assert or return early?

#### Option: Assert with descriptive error

```typescript
assert(blockedByMatch, 'Task passed validation but lacks Blocked By section')
```

Makes the invariant explicit. Fails loudly if violated.

#### Option: Keep defensive return

The current code is safe even if the invariant breaks. Silent degradation may be preferable.

#### Option: Restructure to eliminate guard

Refactor so the guard is unnecessary. More work but cleaner result.

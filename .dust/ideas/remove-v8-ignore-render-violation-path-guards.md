# Remove v8 Ignore: Render Violation Path Guards

Remove the v8 coverage exclusion for defensive guards in `lib/cli/commands/lint-markdown.ts`.

## Current State

Lines 325-329 in `renderViolationPath()`:

```typescript
export function renderViolationPath(filePath: string, cwd: string): string {
  /* v8 ignore start -- defensive guards for non-absolute/empty relative paths */
  if (!isAbsolute(filePath)) return filePath
  const relativePath = relative(cwd, filePath)
  if (relativePath.length === 0) return filePath
  /* v8 ignore stop */
  if (
    relativePath === '..' ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath)
  ) {
    return filePath
  }
  return relativePath
}
```

The guards handle edge cases:
1. Non-absolute input paths (pass through unchanged)
2. Empty relative paths (when `filePath === cwd`)

## Why This Matters

These guards protect against edge cases that may be impossible given current call sites but could occur if the function is reused elsewhere. The exclusion hides these paths from coverage.

## Analysis

**Guard 1: `!isAbsolute(filePath)`**

Current callers likely always pass absolute paths. If this invariant is documented and enforced by the type system or runtime checks at call sites, this guard is redundant.

**Guard 2: `relativePath.length === 0`**

This occurs when `filePath === cwd`. Is this a realistic scenario? If violations are always for files inside `.dust/`, and `cwd` is the repo root, this can't happen.

## Restructuring Approach

**Option A: Test the edge cases**

Add unit tests that exercise these paths:
```typescript
it('returns non-absolute paths unchanged', () => {
  expect(renderViolationPath('relative/path', '/cwd')).toBe('relative/path')
})

it('returns filePath when it equals cwd', () => {
  expect(renderViolationPath('/cwd', '/cwd')).toBe('/cwd')
})
```

**Option B: Remove unreachable guards**

If analysis shows these cases can't occur, remove the guards and let TypeScript/callers ensure the invariants.

**Option C: Assert with descriptive errors**

Replace silent returns with assertions that document the expected invariants:
```typescript
assert(isAbsolute(filePath), 'renderViolationPath expects absolute path')
```

## Benefits

- Edge cases documented by tests or assertions
- No hidden code paths
- Function contract made explicit

## Open Questions

### Should defensive guards be tested or removed?

#### Option: Test the guards

Exercise edge cases even if current callers don't trigger them. Future-proofs the function.

#### Option: Remove and assert

If the guards truly can't be reached, replace with assertions. Fail loudly if assumptions break.

#### Option: Document as defensive

Keep guards and exclusion, add comment explaining these are defensive against future misuse.

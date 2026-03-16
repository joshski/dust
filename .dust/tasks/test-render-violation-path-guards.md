# Test Render Violation Path Guards

Add unit tests for the defensive guards in `renderViolationPath()` and remove the v8 coverage exclusion.

## Current State

Lines 325-329 in `lib/cli/commands/lint-markdown.ts`:

```typescript
export function renderViolationPath(filePath: string, cwd: string): string {
  /* v8 ignore start -- defensive guards for non-absolute/empty relative paths */
  if (!isAbsolute(filePath)) return filePath
  const relativePath = relative(cwd, filePath)
  if (relativePath.length === 0) return filePath
  /* v8 ignore stop */
```

Two guards exist but are excluded from coverage:
1. Non-absolute input paths pass through unchanged
2. Empty relative paths (when `filePath === cwd`) return the original path

## Approach

Add tests that exercise both edge cases:

```typescript
it('returns non-absolute paths unchanged', () => {
  expect(renderViolationPath('relative/path', '/cwd')).toBe('relative/path')
})

it('returns filePath when it equals cwd', () => {
  expect(renderViolationPath('/cwd', '/cwd')).toBe('/cwd')
})
```

Then remove the `/* v8 ignore start */` and `/* v8 ignore stop */` comments.

## Principles

- [Unit Test Coverage](../principles/unit-test-coverage.md)
- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)

## Blocked By

(none)

## Definition of Done

- [ ] Unit tests exercise both defensive guard paths
- [ ] v8 ignore comments are removed from `renderViolationPath()`
- [ ] 100% test coverage is maintained
- [ ] `bin/dust check` passes

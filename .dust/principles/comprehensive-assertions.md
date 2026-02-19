# Comprehensive Assertions

In tests, we should strive for a single complex assertion where the result is determined by the test itself.

## Why it matters

When assertions are comprehensive, test failures provide better feedback. Instead of knowing that an array "doesn't contain 'apples'", we see what the array actually contains.

## In practice

Collapse multiple partial assertions into one comprehensive assertion:

```javascript
// Avoid: multiple partial assertions
expect(array).toContain('apples')
expect(array).toContain('oranges')

// Avoid: assertions in a loop (still multiple assertions)
for (const item of ['apples', 'oranges']) {
  expect(array).toContain(item)
}

// Avoid: partial matchers that don't verify the complete state
expect(array).toEqual(expect.arrayContaining(['apples', 'oranges']))
expect(array).toHaveLength(2)

// Prefer: one assertion that verifies the exact expected value
expect(array).toEqual(['apples', 'oranges'])
```

The comprehensive form:
- Is a single assertion, not multiple assertions or loops
- Verifies the complete expected state, not just fragments
- Provides full context on failure (showing what _is_ present, not just what's missing)
- Makes the test's intent clearer by showing the expected outcome in one place

## How to evaluate

Work supports this goal when tests use assertions that capture the complete expected result, allowing failures to reveal the actual state alongside the expected state.

## Parent Principle

- [Make Changes with Confidence](make-changes-with-confidence.md)

## Sub-Principles

- (none)

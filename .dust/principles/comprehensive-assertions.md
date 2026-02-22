# Comprehensive Assertions

Assert the whole, not the parts.

When you break a complex object into many small assertions, a failure tells you *one thing that's wrong*. When you assert against the whole expected value, the diff tells you *what actually happened versus what you expected* — the full picture, in one glance.

Small assertions are like yes/no questions to a witness. A whole-object assertion is like asking "tell me what you saw."

## In practice

Collapse multiple partial assertions into one comprehensive assertion:

```javascript
// Fragmented — each failure is a narrow keyhole
expect(result.name).toBe("Alice");
expect(result.age).toBe(30);
expect(result.role).toBe("admin");

// Whole — a failure diff tells the full story
expect(result).toEqual({
  name: "Alice",
  age: 30,
  role: "admin",
});
```

If `role` is `"user"` and `age` is `29`, the fragmented version stops at the first failure. The whole-object assertion shows both discrepancies at once, in context.

The same applies to arrays:

```javascript
// Avoid: partial assertions that hide the actual state
expect(array).toContain('apples')
expect(array).toContain('oranges')

// Prefer: one assertion that reveals the full picture on failure
expect(array).toEqual(['apples', 'oranges'])
```

## How to evaluate

Work supports this principle when test failures tell a rich story — showing the complete actual value alongside the complete expected value, so the reader can understand what happened without re-running anything.

## Parent Principle

- [Make Changes with Confidence](make-changes-with-confidence.md)

## Sub-Principles

- (none)

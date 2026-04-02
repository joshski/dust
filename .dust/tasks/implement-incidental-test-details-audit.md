# Implement Incidental Test Details Audit

Add a stock audit that identifies tests with overly specific data and other incidental details that obscure test intent.

## Principles

- [Readable Test Data](../principles/readable-test-data.md)
- [Comprehensive Assertions](../principles/comprehensive-assertions.md)
- [Self-Diagnosing Tests](../principles/self-diagnosing-tests.md)
- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)

## Guidance

### Readable Test Data

Test data setup should use natural structures that mirror what they represent.

When test data is easy to read, tests become self-documenting. A file system hierarchy expressed as a nested object immediately conveys structure, while a flat Map with path strings requires mental parsing to understand the relationships.

Prefer literal structures that visually match the domain:

```javascript
// Avoid: flat paths that obscure hierarchy
const fs = createFileSystemEmulator({
  files: new Map([['/project/.dust/principles/my-goal.md', '# My Goal']]),
  existingPaths: new Set(['/project/.dust/ideas']),
})

// Prefer: nested object that mirrors file system structure
const fs = createFileSystemEmulator({
  project: {
    '.dust': {
      principles: {
        'my-goal.md': '# My Goal'
      },
      ideas: {}
    }
  }
})
```

The nested form:
- Shows parent-child relationships through indentation
- Makes empty directories explicit with empty objects
- Requires no mental path concatenation to understand structure

### Comprehensive Assertions

Assert the whole, not the parts.

When you break a complex object into many small assertions, a failure tells you *one thing that's wrong*. When you assert against the whole expected value, the diff tells you *what actually happened versus what you expected* — the full picture, in one glance.

Small assertions are like yes/no questions to a witness. A whole-object assertion is like asking "tell me what you saw."

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

### Self-Diagnosing Tests

When a big test fails, it should be self-evident how to diagnose and fix the failure.

The more moving parts a test has — end-to-end, system, integration — the more critical this becomes. A test that fails with `expected true, received false` forces the developer (or agent) to re-run, add logging, and guess. A test that fails with a rich diff showing the actual state versus the expected state turns diagnosis into reading.

**Anti-patterns:**

**Boolean flattening** — collapsing a rich value into true/false before asserting:
```javascript
// Bad: "expected true, received false" — what events arrived?
expect(events.some(e => e.type === 'check-passed')).toBe(true)

// Good: shows the actual event types on failure
expect(events.map(e => e.type)).toContain('check-passed')
```

**Length-only assertions** — checking count without showing contents:
```javascript
// Bad: "expected 2, received 0" — what requests were captured?
expect(requests.length).toBe(2)

// Good: shows the actual requests on failure
expect(requests).toHaveLength(2)  // vitest shows the array
```

**Silent guards** — using `if` where an assertion belongs:
```javascript
// Bad: silently passes when settings is undefined
if (settings) {
  expect(JSON.parse(settings).key).toBeDefined()
}

// Good: fails explicitly if settings is missing
expect(settings).toBeDefined()
const parsed = JSON.parse(settings!)
expect(parsed.key).toBeDefined()
```

### Functional Core, Imperative Shell

Separate code into a pure "functional core" and a thin "imperative shell." The core takes values in and returns values out, with no side effects. The shell handles I/O and wires things together.

Purely functional code makes some things easier to understand: because values don't change, you can call functions and know that only their return value matters—they don't change anything outside themselves.

The functional core contains business logic as pure functions that take values and return values. The imperative shell sits at the boundary, reading input, calling into the core, and performing side effects with the results. This keeps the majority of code easy to test (no mocks or stubs needed for pure functions) and makes the I/O surface area small and explicit.

## Task Type

implement

## Blocked By

(none)

## Definition of Done

- Added `incidental-test-details` function to `lib/audits/stock-audits.ts`
- Added the function to the `stockAuditFunctions` export map
- Audit focuses on overly specific test data as the primary pattern
- Audit flags candidates for review without making judgments about necessity
- Audit creates one idea per test file with findings
- Audit focuses purely on test clarity (not performance)
- Audit includes guidance on:
  - Identifying object literals with unused properties in test setup
  - Finding magic numbers without semantic meaning
  - Detecting excessive mock/stub setup
  - Locating complex nested structures where simpler ones would suffice
  - Spotting brittle string assertions coupled to formatting
- Audit instructions tell agents to create idea files (not modify source code)
- All tests pass
- `bin/dust check` passes

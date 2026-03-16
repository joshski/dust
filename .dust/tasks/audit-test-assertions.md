# Audit: Test Assertions

Review test assertions for quality signals beyond comprehensive assertions.

Review existing ideas in `./.dust/ideas/` to understand what has been proposed or considered historically, then create new idea files in `./.dust/ideas/` for any issues you identify, avoiding duplication.

## Background

The [Comprehensive Assertions](../principles/comprehensive-assertions.md) principle covers asserting whole objects rather than fragments. The [Self-Diagnosing Tests](../principles/self-diagnosing-tests.md) principle covers making failure messages informative. This audit addresses complementary assertion quality signals not covered by existing principles.

## Scope

### Deterministic Assertions

Assertions should produce the same result regardless of execution timing or environment. Anti-patterns include:

- Asserting on timestamps or dates without mocking time
- Asserting on random values without seeding
- Asserting on iteration order of unordered collections (objects, Sets, Maps)
- Asserting on process IDs, file handles, or other system-allocated values

Example:
```javascript
// Non-deterministic: order depends on JS engine
expect(Object.keys(result)).toEqual(['a', 'b', 'c'])

// Deterministic: sort before comparison
expect(Object.keys(result).sort()).toEqual(['a', 'b', 'c'])
```

### Fixed Delay Anti-patterns

Tests should not use arbitrary fixed delays (`setTimeout`, `sleep`) to wait for async operations. Fixed delays are:

- Flaky (may fail on slower machines or under load)
- Slow (must wait the full delay even when the operation completes early)
- Non-deterministic (timing varies across environments)

Instead, tests should:
- Use promise resolution (`await`/`.then()`)
- Poll with short intervals until a condition is met
- Use test framework utilities (`vi.useFakeTimers()`, `waitFor()`)
- Inject controllable time dependencies

Example:
```javascript
// Bad: arbitrary 50ms delay
await new Promise(r => setTimeout(r, 50))
expect(state).toBe('ready')

// Better: wait for the condition
await vi.waitFor(() => expect(state).toBe('ready'))

// Best: control time explicitly
vi.useFakeTimers()
vi.advanceTimersByTime(50)
expect(state).toBe('ready')
```

### Precise but Not Exhaustive Assertions

Assertions should verify the behavior under test without over-constraining implementation details. Exhaustive assertions that check every property can:

- Couple tests tightly to implementation
- Require test updates for unrelated changes
- Obscure what the test is actually verifying

This works in tension with [Comprehensive Assertions](../principles/comprehensive-assertions.md). Let context determine the balance:
- Public API contracts → comprehensive assertions
- Internal implementation tests → precise assertions
- Snapshot tests → consider `toMatchSnapshot()` with care

Example:
```javascript
// Exhaustive: breaks if any internal field changes
expect(result).toEqual({
  id: 'abc',
  name: 'test',
  _internal: {},
  _meta: { version: 1 },
  _cache: null,
})

// Precise: verifies only the relevant properties
expect(result).toMatchObject({
  id: 'abc',
  name: 'test',
})
```

### One Logical Assertion Per Test

Tests should ideally verify one behavior or scenario. When a test has multiple unrelated assertions, a failure in the first masks all subsequent ones.

This does not mean "one `expect` call per test". A single logical assertion may require multiple `expect` calls to express (especially for complex state). The [Comprehensive Assertions](../principles/comprehensive-assertions.md) principle often allows collapsing multiple calls into one whole-object assertion.

The anti-pattern to avoid:
```javascript
test('user validation', () => {
  // Multiple unrelated behaviors in one test
  expect(validateEmail('bad')).toBe(false)
  expect(validateEmail('good@example.com')).toBe(true)
  expect(validatePassword('short')).toBe(false)
  expect(validatePassword('LongEnough123!')).toBe(true)
})
```

Prefer separate tests for separate behaviors:
```javascript
test('rejects invalid email format', () => {
  expect(validateEmail('bad')).toBe(false)
})

test('accepts valid email format', () => {
  expect(validateEmail('good@example.com')).toBe(true)
})
```

## Analysis Steps

1. Search for assertions on `Date.now()`, `new Date()`, or timestamp fields without fake timers
2. Look for assertions on `Object.keys()` or property iteration without sorting
3. Find `setTimeout`, `sleep`, or fixed delays in test files
4. Identify tests with many unrelated assertions covering multiple behaviors
5. Review snapshot usage for overly broad snapshots that capture internal details
6. Check for assertions on random or system-allocated values (PIDs, UUIDs without seeding)

## Output

For each finding, provide:
- **Location** - File path and line number
- **Pattern** - Which category of issue (non-deterministic, fixed delay, exhaustive, multiple behaviors)
- **Impact** - How this affects test reliability or maintainability
- **Suggestion** - Specific fix (sort keys, use fake timers, split test, use toMatchObject, etc.)

## Principles

- [Comprehensive Assertions](../principles/comprehensive-assertions.md) — Tension with "precise but not exhaustive"; balance depends on context
- [Self-Diagnosing Tests](../principles/self-diagnosing-tests.md) — Informative failures require precise assertions
- [Keep Unit Tests Pure](../principles/keep-unit-tests-pure.md) — Determinism is essential for purity
- [Reproducible Checks](../principles/reproducible-checks.md) — Deterministic assertions support reproducibility
- [Test Isolation](../principles/test-isolation.md) — Fixed delays can cause race conditions between tests

## Blocked By

(none)

## Definition of Done

- Searched for non-deterministic assertions (timestamps, object key order, random values)
- Identified fixed delay patterns in test files
- Reviewed assertions for over-constraining internal details
- Found tests covering multiple unrelated behaviors
- Documented each finding with location, pattern, impact, and suggestion
- Proposed ideas for any assertion quality improvements identified
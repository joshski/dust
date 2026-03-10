# Self-Diagnosing Tests

When a big test fails, it should be self-evident how to diagnose and fix the failure.

The more moving parts a test has — end-to-end, system, integration — the more critical this becomes. A test that fails with `expected true, received false` forces the developer (or agent) to re-run, add logging, and guess. A test that fails with a rich diff showing the actual state versus the expected state turns diagnosis into reading.

## Anti-patterns

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

## The test

If a test fails, can a developer who has never seen the code identify the problem from the failure output alone — without re-running, adding console.logs, or reading the test source? The closer to "yes", the better.

## How to evaluate

Work supports this principle when every assertion in a system or integration test would, on failure, reveal the actual state richly enough to guide a fix. Bare boolean checks, length-only assertions, and silent conditional guards are violations.

## Parent Principle

- [Make Changes with Confidence](make-changes-with-confidence.md)

## Sub-Principles

- (none)

# Audit test assertion patterns

Review test assertions for alignment with the Comprehensive Assertions principle.

## Background

The [Comprehensive Assertions](../principles/comprehensive-assertions.md) principle states: "Assert the whole, not the parts. When you break a complex object into many small assertions, a failure tells you *one thing that's wrong*. When you assert against the whole expected value, the diff tells you *what actually happened versus what you expected*."

This principle is well-documented but has no associated work to verify the codebase follows it. A targeted audit would identify tests that use fragmented assertions and could benefit from whole-object assertions.

## Scope

Search the test suite for patterns that indicate fragmented assertions:

1. **Multiple property assertions** - Sequences like:
   ```javascript
   expect(result.name).toBe('Alice')
   expect(result.age).toBe(30)
   expect(result.role).toBe('admin')
   ```

2. **Partial array assertions** - Using `toContain` multiple times instead of `toEqual`:
   ```javascript
   expect(array).toContain('apples')
   expect(array).toContain('oranges')
   ```

3. **Length-first assertions** - Checking length before checking content:
   ```javascript
   expect(array.length).toBe(2)
   expect(array[0]).toBe('first')
   ```

## Expected Outcome

For each fragmented assertion pattern found:
- Document the test file and test name
- Show the current fragmented pattern
- Suggest the equivalent whole-object assertion

Create ideas for any patterns that appear frequently enough to warrant cleanup.

## Principle Alignment

- [Comprehensive Assertions](../principles/comprehensive-assertions.md) - Directly supports this principle
- [Make Changes with Confidence](../principles/make-changes-with-confidence.md) - Better assertions improve debugging
- [Readable Test Data](../principles/readable-test-data.md) - Whole-object assertions often produce more readable tests

## Open Questions

### Should this be a stock audit?

#### Add as stock audit

Make this audit available to all dust users via `dust audit test-assertion-patterns`. Helps other projects adopt the comprehensive assertions principle.

#### Keep as one-time task

Run the audit once on the dust codebase, fix the issues found, and don't create a reusable audit. The pattern is specific enough that ongoing enforcement may not be needed.

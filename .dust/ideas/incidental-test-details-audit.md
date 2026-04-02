# Incidental Test Details Audit

Add a stock audit that reviews tests for "incidental details" that hide intent and make tests fragile.

## Context

Test code often includes details that are not pertinent to what's being tested. These incidental details:
- Obscure the test's actual purpose
- Make tests more likely to fail for unrelated reasons
- Increase maintenance burden when unrelated code changes
- Force readers to figure out which details matter

The codebase has several principles related to test quality:
- Readable Test Data (.dust/principles/readable-test-data.md:1) - "Test data setup should use natural structures that mirror what they represent"
- Comprehensive Assertions (.dust/principles/comprehensive-assertions.md:1) - "Assert the whole, not the parts"
- Self-Diagnosing Tests (.dust/principles/self-diagnosing-tests.md:1) - "When a big test fails, it should be self-evident how to diagnose and fix the failure"

However, there's no systematic audit to find tests that include incidental details that could be abstracted, defaulted, or removed.

## What Are Incidental Details?

Incidental details are test setup or assertion values that don't relate to what the test is verifying. Examples:

### 1. Irrelevant Field Values
```typescript
// Incidental: test is about validation, but specifies a specific user ID
const user = { id: 12345, name: '', role: 'admin' }
expect(validateUser(user)).toContain('name is required')

// Intent-revealing: only the relevant field is specified
const user = { name: '', role: 'admin' }
expect(validateUser(user)).toContain('name is required')
```

### 2. Magic Numbers Without Meaning
```typescript
// Incidental: why 42? why 100? what's being tested?
await sleepWithProgress(sleepFn, 42, writeFn, lineFn)

// Intent-revealing: describes what's being tested
await sleepWithProgress(sleepFn, TIMEOUT_MS, writeFn, lineFn)
```

### 3. Complex Test Data Unrelated to Test Purpose
```typescript
// Incidental: creates full file system structure when testing one path
const fs = createFileSystemEmulator({
  'project': {
    '.dust': {
      'ideas': { 'idea1.md': '# Idea 1', 'idea2.md': '# Idea 2' },
      'tasks': { 'task1.md': '# Task 1' },
      'principles': { 'principle1.md': '# Principle 1' }
    },
    'src': { 'index.ts': 'export {}' }
  }
})
const result = findIdea(fs, 'idea1.md')

// Intent-revealing: only creates what's needed for the test
const fs = createFileSystemEmulator({
  'project/.dust/ideas/idea1.md': '# Idea 1'
})
const result = findIdea(fs, 'idea1.md')
```

### 4. Brittle String Assertions
```typescript
// Incidental: test breaks if unrelated output formatting changes
expect(output).toBe('Error: Invalid input\nExpected format: JSON\nReceived: XML')

// Intent-revealing: asserts the relevant parts
expect(output).toContain('Invalid input')
expect(output).toContain('Expected format: JSON')
```

### 5. Unnecessary Mocks and Stubs
```typescript
// Incidental: mocking unrelated dependencies
const fs = createMock()
const logger = createMock()
const db = createMock()
const result = calculateTotal([1, 2, 3])

// Intent-revealing: only inject what the function uses
const result = calculateTotal([1, 2, 3])
```

## Incidental Details vs. Necessary Context

Not all details are incidental. Some details are necessary for:
- **Demonstrating edge cases** - Specific values that trigger boundary conditions
- **Showing domain constraints** - Values that represent real-world limits or rules
- **Establishing relationships** - Data that connects entities in meaningful ways

The test of "incidental" is: **if this value changed, would the test still verify the same behavior?**

If yes, it's likely incidental. If no, it's necessary context.

## Proposed Audit

Add a stock audit named `incidental-test-details` in `lib/audits/stock-audits.ts`.

The audit should review test files to identify common patterns of incidental details:

1. **Overly specific test data** - Test setup that includes fields or values not relevant to what's being tested
2. **Magic numbers** - Hardcoded numeric values without clear meaning in test context
3. **Excessive mock setup** - Mocking dependencies that the tested code doesn't use
4. **Complex data structures** - Test fixtures that create elaborate hierarchies when simple structures would suffice
5. **Brittle assertions** - Assertions that couple to implementation details or formatting

## Analysis Approach

The audit should:
1. Identify test files (files ending in `.test.ts`, `.test.js`, `.spec.ts`, etc.)
2. For each test file, look for patterns that suggest incidental details
3. Review test setup (data creation, mocks, stubs)
4. Review assertions (overly specific expectations, coupled to format)
5. Create ideas for tests that could be simplified by removing incidental details

## Output Format

For each finding, create an idea that includes:
- Test file path and specific test case(s)
- Pattern identified (overly specific data, magic number, etc.)
- Why the current approach is problematic (what fails unnecessarily, what's obscured)
- Suggested refactoring to reveal intent

## Detection Heuristics

### Overly Specific Test Data
- Look for object literals in test setup with many properties
- Check if all properties are referenced in assertions or test logic
- Flag objects where >50% of properties are never referenced

### Magic Numbers
- Find numeric literals in test code (excluding 0, 1, -1, common boundaries)
- Check if the number has a descriptive name or comment nearby
- Flag numbers without clear semantic meaning

### Excessive Mock Setup
- Identify mock/stub creation in test setup
- Trace whether each mock is actually called by the code under test
- Flag mocks that are created but never invoked

### Complex Data Structures
- Find nested object/array literals deeper than 2-3 levels
- Check if all branches of the nested structure are relevant to test assertions
- Flag structures where large portions go unused

### Brittle Assertions
- Look for exact string matching (`.toBe()`, `.toEqual()`) on multi-line strings
- Find assertions on implementation details (CSS classes, element IDs, exact format)
- Flag assertions that could use `.toContain()`, `.toMatch()`, or partial matching

## Relationship to Existing Principles

This audit directly supports:
- **Readable Test Data** - Removing incidental details makes tests more readable
- **Self-Diagnosing Tests** - Tests with less noise are easier to understand when they fail
- **Comprehensive Assertions** - Removing brittle assertions leads to better assertion patterns
- **Design for Testability** - Identifying incidental mocks reveals coupling issues

## Open Questions

### Should this audit focus on specific types of incidental details first?

#### Option: Start with overly specific test data

Focus the first version on detecting test objects with unused properties. Benefits: high signal-to-noise ratio, clear refactoring path, measurable impact on test clarity.

#### Option: Start with magic numbers

Focus on numeric literals without semantic meaning. Benefits: easier to detect programmatically, less subjective than evaluating data structure complexity.

#### Option: Comprehensive from the start

Audit all types of incidental details in one pass. Benefits: complete picture of test quality issues, can prioritize findings by severity. Drawbacks: may produce overwhelming output, harder to implement effectively.

### How should the audit distinguish incidental from necessary details?

#### Option: Flag all candidates, let reviewers decide

Use heuristics to identify potential incidental details, but don't judge whether they're actually problematic. Benefits: avoids false negatives, respects project-specific conventions. Drawbacks: may produce noisy output with many false positives.

#### Option: Use sophisticated analysis

Track data flow from setup through test logic to assertions, flagging only values that are provably unused. Benefits: higher precision, less noise. Drawbacks: complex to implement, may miss subtle cases.

#### Option: Combine heuristics with allowlists

Flag candidates but allow projects to suppress specific patterns via configuration. Benefits: balances precision with flexibility, improves over time as patterns are validated.

### Should this audit generate per-test ideas or batched refactorings?

#### Option: One idea per test file

Group all findings for a test file into a single idea for refactoring. Benefits: reduces idea proliferation, enables holistic test improvement. Drawbacks: may create large ideas that are hard to tackle atomically.

#### Option: One idea per test case

Create separate ideas for each test case with incidental details. Benefits: atomic improvements, clear scope for each idea. Drawbacks: may create many small ideas, harder to see patterns across tests.

#### Option: One idea per pattern type

Group findings by pattern (all magic numbers together, all overly-specific data together). Benefits: enables systematic fixes using the same technique. Drawbacks: may split related findings across multiple ideas.

### Should this audit consider test performance?

#### Option: Include performance implications

Flag incidental details that also slow down tests (excessive mocking, large data structures). Benefits: combines test clarity with performance optimization. Drawbacks: conflates two concerns, may prioritize wrong fixes.

#### Option: Focus purely on clarity

Ignore performance implications, focusing only on test readability and fragility. Benefits: simpler scope, clearer purpose. Drawbacks: may miss opportunities to improve both clarity and speed.

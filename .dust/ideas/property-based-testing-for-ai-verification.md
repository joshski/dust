# Property-Based Testing for AI Verification

Help humans verify AI-generated code by testing invariants that must hold for any valid input.

## Background

AI agents generate code that passes existing tests, but humans reviewing that code must assess whether it handles edge cases correctly. Traditional example-based tests check specific inputs produce specific outputs. Property-based testing (PBT) instead defines invariants that must hold for *any* valid input, then generates hundreds of random inputs to find counterexamples.

This inverts the verification burden: instead of the human imagining edge cases the AI might have missed, the testing framework searches for inputs that break the AI's implementation. When a property test fails, it provides a minimal counterexample that helps both human and AI understand the bug.

## Relevance to Dust

The [Human-AI Collaboration](../principles/human-ai-collaboration.md) principle positions humans as the CEO who "set direction, make strategic decisions, and check in when it matters." Property-based tests are a high-leverage way for humans to "check in" — they express *what* should be true without specifying *how* to test it, then let the framework do the searching.

The [Comprehensive Test Coverage](../principles/comprehensive-test-coverage.md) principle notes that "agents cannot manually verify that their changes work. They rely entirely on automated tests to confirm correctness." Property-based tests strengthen this safety net by exploring the input space more thoroughly than hand-written examples.

## Candidate Areas in Dust

Based on codebase exploration, the following areas are good candidates for property-based testing:

### Markdown Parsing (`lib/artifacts/parsed-artifact.ts`)

Properties to verify:
- Parsing the same content twice yields identical results
- Section order is preserved
- All markdown links are extracted regardless of position
- Line numbers are monotonically increasing
- Content inside code fences is never parsed as structure

### Serialization Round-trips

Properties to verify:
- `serialize(parse(content))` preserves semantic meaning
- `parse(serialize(artifact))` returns the original artifact
- Special characters in content survive round-trips

### Title to Filename Conversion (`lib/artifacts/naming.ts`)

Properties to verify:
- Output always ends with `.md`
- Output is lowercase
- Output contains only alphanumeric characters and hyphens
- No leading or trailing hyphens
- Multiple consecutive spaces collapse to single hyphen

### Validation Pipeline (`lib/validation/`)

Properties to verify:
- Validation is deterministic (same input = same violations)
- All violations reference valid file paths
- Valid inputs never produce violations

## Implementation Approach

[fast-check](https://fast-check.dev) is a mature JavaScript property-based testing library with TypeScript support. It integrates with Vitest and provides:

- Built-in "arbitraries" (generators) for common types
- Automatic shrinking to find minimal failing examples
- Reproducible runs via seed values

Example test structure:

```typescript
import fc from 'fast-check'
import { titleToFilename } from './naming'

test('titleToFilename produces valid filenames', () => {
  fc.assert(
    fc.property(fc.string(), (title) => {
      const filename = titleToFilename(title)
      return (
        filename.endsWith('.md') &&
        filename === filename.toLowerCase() &&
        /^[a-z0-9-]+\.md$/.test(filename)
      )
    })
  )
})
```

## Principle Alignment

- [Reproducible Checks](../principles/reproducible-checks.md) — Property tests use deterministic seeds, producing consistent results across runs
- [Make Changes with Confidence](../principles/make-changes-with-confidence.md) — Broader input coverage increases confidence
- [Fast Feedback](../principles/fast-feedback.md) — Minimal counterexamples speed up debugging
- [Readable Test Data](../principles/readable-test-data.md) — Shrinking produces the simplest failing case, not a random mess

## Open Questions

### When should property-based tests be written?

#### After implementation, as a verification layer

Human reviewers add property tests to AI-generated code before merging. This fits the "CEO checks in" workflow — the human doesn't direct the implementation but validates it through properties.

#### During implementation, alongside example tests

AI agents write property tests as part of their implementation. This requires agents to understand PBT conventions and may increase task complexity.

#### On-demand via a dedicated workflow task

A separate "Add property tests for X" task type where either human or agent can request property test coverage for specific modules.

### What is the scope of initial adoption?

#### Internal tooling only

Introduce property-based testing to the dust codebase itself (parsing, validation, serialization) to validate the approach before recommending it to users.

#### Dust features plus documentation

Add property tests to dust internals and document the pattern in principles/facts so users can adopt it in their own projects.

#### Built-in workflow support

Extend dust with workflow tasks or commands that help users add property tests (e.g., `dust add property-tests` or a "Verify: Add property tests" task type).

### How should property test failures be reported?

#### Standard test output with minimal counterexample

Fast-check's default output shows the shrunk input that caused the failure. This is usually sufficient for debugging.

#### Enhanced diagnostics with full shrinking trace

Configure fast-check to show the shrinking path, helping users understand how the counterexample was simplified. More verbose but educational.

#### Custom reporter integration

Build a dust-specific reporter that formats property test failures for agent consumption, highlighting the input properties that triggered the failure.

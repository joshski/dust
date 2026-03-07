# Antipatterns Audit

Add a stock audit that identifies antipatterns and code smells in the codebase.

## Context

The existing audit suite covers specific concerns like error handling, test coverage, and component reuse. An antipatterns audit would provide a broader code quality review, identifying patterns that make code harder to understand, maintain, or extend.

Related ideas cover specific antipatterns: [Harden Claude event and tool input typing](harden-claude-event-and-tool-input-typing.md), [Centralize filesystem error code narrowing](centralize-filesystem-error-code-narrowing.md), and [Reduce unsafe double casts in tests](reduce-unsafe-double-casts-in-tests.md) address type-safety issues; [Establish consistent error handling](establish-consistent-error-handling.md) covers error patterns; and [Duplicate code in recent commits audit](duplicate-code-in-recent-commits-audit.md) addresses duplication. This audit complements those by covering structural and organizational antipatterns.

## Proposed Audit Focus Areas

### Single Responsibility Violations

Functions or files that do too many things. Indicators:
- Functions longer than 50 lines with multiple distinct responsibilities
- Files that orchestrate unrelated concerns (display + validation + data access)
- High number of parameters suggesting the function takes on too much

Current examples in codebase:
- `lib/cli/commands/check.ts` `check()` function handles argument parsing, settings loading, execution strategy selection, and result display
- `lib/validation/index.ts` `validatePatch()` orchestrates 10+ validators with 144 lines of logic

### Deep Nesting

Code with excessive indentation that obscures the happy path. Indicators:
- Three or more levels of nested conditionals
- Nested loops with early returns that could be extracted
- Complex guard clauses that could use early return pattern

Current examples:
- `lib/markdown/markdown-utilities.ts` `extractOpeningSentence()` has nested loops that could be extracted into helper functions

### Naming Inconsistency

Mixed conventions for similar concepts. Indicators:
- Factory functions using both "build" and "create" prefixes
- Inconsistent path construction (template literals vs `join()` vs concatenation)
- Callback naming mixing verb-first and noun-first patterns

Current examples:
- `buildArtifactsRepository` vs `createLogBuffer` vs `createWakeUpHandler`

### Coverage Escapes

Excessive use of `v8 ignore` or `biome-ignore` directives. Indicators:
- Defensive code paths that are hard to test
- Error handlers that catch but don't surface errors
- Code branches that "can't happen" but aren't provable

Current state: 54 ignore directives across the codebase, concentrated in `bucket/repository-loop.ts`, `bucket/terminal-ui.ts`, and `validation/index.ts`

### Primitive Obsession

Using strings or numbers where domain types would be clearer. Indicators:
- Magic strings repeated across files without central definition
- Numeric thresholds without named constants
- String paths used instead of typed file references

Current examples:
- Content type strings ('principles', 'facts', 'ideas', 'tasks') defined in multiple places
- Timeout values scattered without explanation

### Interface Bloat

Interfaces with too many fields managing multiple concerns. Indicators:
- Interfaces with more than 7 fields
- Fields representing unrelated concepts grouped together
- Optional fields that are always provided or never provided

Current examples:
- `TerminalUIState` in `bucket/terminal-ui.ts` manages selection, display, and configuration concerns

## Implementation

Add a stock audit in `lib/audits/stock-audits.ts`:

```
# Antipatterns Audit

Review the codebase for structural antipatterns and code smells that make code harder to understand or modify.

## Focus Areas

For each area below, identify specific instances and assess severity (blocking change, slowing comprehension, minor friction):

1. **Single Responsibility Violations** - Functions/files doing too many things
2. **Deep Nesting** - Excessive indentation obscuring logic flow
3. **Naming Inconsistency** - Mixed conventions for similar concepts
4. **Coverage Escapes** - Excessive v8/biome ignore directives
5. **Primitive Obsession** - Strings/numbers instead of domain types
6. **Interface Bloat** - Large interfaces mixing concerns

## Output

For each antipattern found:
- **Location** - File and line number
- **Severity** - Blocking, slowing, or minor
- **Recommendation** - Specific refactoring to address it
- **Related principle** - Which dust principle this violates

If the number of instances is high, focus on the most impactful.
```

## Relationship to Existing Audits

| Audit | Focus | Overlap |
|-------|-------|---------|
| component-reuse | Duplication | Complementary - this focuses on structure |
| refactoring-opportunities | General improvements | Complementary - this targets specific patterns |
| dead-code | Unused code | Orthogonal - different concern |

## Open Questions

### Should coverage escapes be flagged or accepted?

#### Flag as technical debt

`v8 ignore` directives often indicate code that's difficult to test. The audit should flag these as opportunities to improve testability or restructure code.

#### Accept as pragmatic

Some defensive code paths genuinely can't be tested without excessive mocking. The ignore directives are appropriate and shouldn't be flagged.

#### Flag only excessive concentrations

Individual ignores are fine, but files with many ignores (5+) suggest a structural problem worth investigating.

### How should severity be determined?

#### Based on change frequency

Antipatterns in frequently-modified code are higher severity than those in stable code. Use git history to weight findings.

#### Based on comprehension impact

Rate severity by how much the pattern impedes understanding. Deep nesting or unclear naming is higher severity than unused parameters.

#### Let the auditor judge

Provide examples of each severity level and let the agent assess each finding individually.

### Should the audit auto-generate ideas for fixes?

#### Generate ideas for high-severity items

When the audit finds blocking or slowing antipatterns, automatically create idea files for the fixes. Keeps the workflow moving.

#### Report only

The audit should report findings without creating ideas. The user or agent decides what to address. Avoids idea proliferation.

#### Generate a single summary idea

Create one idea that summarizes findings and lists potential fixes. Keeps ideas consolidated while preserving actionability.

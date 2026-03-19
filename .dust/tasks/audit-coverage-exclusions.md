# Audit: Coverage Exclusions

Audit all coverage exclusions to identify opportunities for removal through refactoring.

Review existing ideas in `./.dust/ideas/` to understand what has been proposed or considered historically, then create new idea files in `./.dust/ideas/` for any issues you identify, avoiding duplication.

## Scope

Search for exclusions in both configuration and source code:

1. **Configuration-level exclusions** - Review test framework configuration for file/directory exclusion patterns
2. **Inline escape directives** - Search for comments that exclude code from coverage (e.g., ignore directives in source files)
3. **Test files** - Include test code in the search; inline directives may hide flaky or unclear test logic

## Analysis

For each exclusion found:

1. **Document the location** - File path and line number (or config section)
2. **Identify the reason** - Why was this exclusion added?
3. **Categorize by justification**:
   - Native wrapper (code that wraps platform APIs with no testable logic)
   - Defensive guard (unreachable error handling for type safety)
   - Integration boundary (code that requires external systems)
   - Tooling limitation (coverage tool bug or limitation)
   - Technical debt (code that should be testable but isn't)
   - Unknown (no clear justification found)
4. **Label justification quality** - Is the justification well-documented, reasonable, or questionable?
5. **Evaluate removal potential** - Can the exclusion be removed through decoupling or refactoring?

## Blocked By

(none)

## Definition of Done

- Identified all configuration-level coverage exclusions
- Searched source and test files for inline escape directives
- Documented the reason each exclusion exists
- Categorized each exclusion by justification type
- Labeled justification quality for visibility
- Identified exclusions that could be removed through decoupling
- Proposed ideas for refactoring where feasible
# Co-Located Tests Audit

Add a stock audit that identifies test files not located next to the code they test.

## Context

The "co-located-tests" principle states that test files should live next to the code they test. This improves discoverability, makes the relationship between tests and implementation explicit, and reduces friction when modifying code.

Currently, there is no stock audit to detect violations of this principle. Codebases may have test files in separate directories (e.g., `tests/`, `spec/`, `__tests__/` at the root) rather than co-located with implementation.

## Proposed Audit

Create a `co-located-tests` stock audit in `lib/audits/stock-audits.ts` that:

1. **Detects common test directory patterns**:
   - Root-level test directories (`tests/`, `spec/`, `__tests__/`)
   - Language-specific patterns (e.g., Python's `tests/` convention, Go's `_test.go` suffix in different dirs)
   - Framework-specific patterns (e.g., Rails `spec/` directory)

2. **Identifies mismatches**:
   - Test files far from their implementation (e.g., `tests/models/user.test.ts` vs `src/models/user.ts`)
   - Orphaned test files (tests without corresponding implementation)
   - Untested implementation files (implementation without corresponding tests)

3. **Suggests improvements**:
   - Propose moving test files next to implementation
   - Identify cases where co-location may not be appropriate (e.g., integration tests, E2E tests)
   - Consider language/framework conventions that may conflict with co-location

## Related Principles

- **co-located-tests** - Primary principle this audit enforces
- **intuitive-directory-structure** - Co-location improves directory structure clarity
- **context-optimised-code** - Co-location reduces context switching

## Output Format

For each violation, the audit should create ideas containing:
- Test file path and corresponding implementation file path
- Distance/separation between test and implementation
- Suggested new location for the test file
- Any blockers to co-location (e.g., build system constraints)

## Open Questions

### Should the audit detect different test types?

#### Option: Distinguish unit vs integration vs E2E tests

Only flag non-co-located unit tests. Integration and E2E tests often live in separate directories by necessity and convention.

Pros: Reduces false positives, aligns with common practice
Cons: Requires heuristics to classify test types, may miss opportunities

#### Option: Flag all non-co-located tests

Flag any test file not adjacent to implementation, letting reviewers decide if separation is justified.

Pros: Comprehensive coverage, simple logic
Cons: May create noise for legitimate separation cases

### How should the audit handle language/framework conventions?

#### Option: Provide framework-specific guidance

Detect the project type (Node.js, Python, Go, etc.) and apply framework-specific rules.

Pros: More accurate, respects established conventions
Cons: Complex, requires maintaining framework knowledge

#### Option: Use generic heuristics only

Apply simple pattern matching regardless of framework.

Pros: Simple, works across all projects
Cons: May conflict with language/framework conventions

### Should the audit suggest specific moves or just identify the pattern?

#### Option: Suggest specific file moves

For each test file, propose the exact path where it should be moved.

Pros: Actionable, clear guidance
Cons: May suggest moves that conflict with build systems or conventions

#### Option: Identify the pattern only

Flag directories with non-co-located tests without suggesting specific moves.

Pros: Avoids prescriptive suggestions that may be wrong
Cons: Less actionable, requires more analysis to fix

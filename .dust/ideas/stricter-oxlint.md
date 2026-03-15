# Stricter oxlint

Enable additional oxlint rules to improve code quality and catch bugs earlier.

## Background

The project currently runs `bunx oxlint .` with default rules plus one custom plugin rule (`dust/command-exports-matching-filename`). Oxlint provides several additional rule categories and plugins that are disabled by default but could catch common bugs and code quality issues.

## Current Configuration

The `.oxlintrc.json` file enables:
- Default correctness rules (213 rules enabled)
- Default unicorn/oxc/typescript rules
- One custom plugin rule

## Rule Categories Analysis

### Suspicious Category (50 rules)

Enabling `-D suspicious` found 102 errors and 13 warnings across the codebase:
- **`consistent-function-scoping`** (9 violations) - Functions that don't capture variables from parent scope should be moved to outer scope
- **`no-array-sort`** (5 violations) - Suggests using `toSorted()` instead of mutating `sort()`
- **`no-shadow`** - Variable shadowing detection

Most violations are minor refactoring opportunities rather than bugs.

### Pedantic Category (114 rules)

Enabling `-D pedantic` found 1156 errors - too many for a single change:
- **`require-await`** (317 violations) - Async functions without await expressions
- **`no-hex-escape`** (85 violations) - Prefers Unicode escapes over hex escapes
- **`escape-case`** (82 violations) - Uppercase escape sequences
- **`no-inline-comments`** (77 violations) - Comments on same line as code
- **`prefer-event-target`** (69 violations) - EventTarget over EventEmitter
- **`max-lines-per-function`** (many violations) - Function length limits

Many of these are stylistic or would require significant refactoring.

### Perf Category (13 rules)

Enabling `-D perf` found 52 errors:
- **`no-await-in-loop`** (majority of violations) - Sequential await in loops could be parallelized
- **`no-map-spread`** (1 violation) - Spreading objects in map creates unnecessary allocations
- **`prefer-set-has`** (1 violation) - Array membership checks should use Set

The `no-await-in-loop` violations are mostly intentional (sequential file processing, rate limiting).

### Vitest Plugin

Enabling `--vitest-plugin` adds test-specific rules:
- `consistent-each-for`
- `no-conditional-tests`
- `prefer-to-be-truthy`/`prefer-to-be-falsy`
- And others

No new errors beyond existing default violations.

### Promise Plugin

Enabling `--promise-plugin` adds promise-specific correctness rules but found no violations beyond defaults.

## High-Value Individual Rules

Several individual rules are already enforced by defaults:
- **`eqeqeq`** - No violations (good)
- **`no-var`** - No violations (good)

## Principle Alignment

- [Lint Everything](../principles/lint-everything.md) - More rules means more static analysis coverage
- [Fast Feedback Loops](../principles/fast-feedback-loops.md) - Catching issues at lint time rather than runtime
- [Stop the Line](../principles/stop-the-line.md) - Failing builds on potential bugs

## Open Questions

### Which rule category should be enabled first?

#### Suspicious category

Moderate violation count (102 errors). Most are legitimate improvements. Rules like `consistent-function-scoping`, `no-array-sort`, and `no-shadow` catch real issues.

#### Perf category

Lower violation count (52 errors) but many are intentional patterns (`no-await-in-loop` for sequential processing). Would require significant disable comments.

#### Individual high-value rules only

Cherry-pick specific rules rather than enabling full categories. More targeted but requires researching each rule individually.

### How should existing violations be addressed?

#### Fix all violations before enabling rules

Clean up the codebase first, then enable the rules. Ensures CI stays green throughout.

#### Enable rules and fix violations incrementally

Enable rules as errors but create separate tasks/ideas for fixing each category of violation. Temporarily break the build or use inline disables.

#### Enable rules as warnings first

Use `-W` instead of `-D` to warn rather than error. Allows gradual cleanup without breaking CI.

### Should intentional violations use inline disable comments?

#### Use oxlint-disable comments

Add `// oxlint-disable-next-line` for intentional violations like sequential await in loops. Explicit documentation of why rules are bypassed.

#### Use rule configuration to exclude patterns

Configure rules in `.oxlintrc.json` to exclude specific files or directories. Cleaner code but less visible intent.

#### Refactor code to avoid violations

Change patterns to comply with rules (e.g., use `Promise.all` instead of sequential await). Best for code quality but highest effort.

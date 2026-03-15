# Stricter oxlint

Enable the oxlint `suspicious` category to catch more potential bugs through static analysis.

## Background

The project currently runs `bunx oxlint .` with default rules plus one custom plugin rule (`dust/command-exports-matching-filename`). Oxlint provides the `suspicious` category containing 50 additional rules that catch common code quality issues.

## Current Configuration

The `.oxlintrc.json` file enables:
- Default correctness rules (213 rules enabled)
- Default unicorn/oxc/typescript rules
- One custom plugin rule

## Proposal

Enable the `suspicious` category by adding `"-D suspicious"` to the oxlint command in the check configuration. Before enabling, all 115 existing violations must be fixed.

## Violation Breakdown

Current violations when running `bunx oxlint -D suspicious`:

| Rule | Count | Description |
|------|-------|-------------|
| `no-array-sort` | 32 | Use `toSorted()` instead of mutating `sort()` |
| `prefer-add-event-listener` | 15 | Prefer `addEventListener()` over `on*` properties |
| `consistent-function-scoping` | ~20 | Move functions that don't capture scope variables |
| `no-shadow` | 12 | Variable shadowing in nested scopes |
| `require-yield` | 5 | Generator functions without yield |
| `no-control-regex` | 3 | Control characters in regex (ANSI codes) |
| `no-unsafe-optional-chaining` | 2 | Optional chaining that could throw |
| Other | ~5 | Minor violations |

## Implementation Approach

Per the resolved decisions:
1. **Category**: Enable the `suspicious` category first
2. **Violations**: Fix all violations before enabling rules (keeps CI green)
3. **Intentional patterns**: Refactor code to comply rather than using disable comments

This means creating separate implementation ideas to fix each violation category before the final enablement.

## Principle Alignment

- [Lint Everything](../principles/lint-everything.md) - More rules means more static analysis coverage
- [Fast Feedback Loops](../principles/fast-feedback-loops.md) - Catching issues at lint time rather than runtime
- [Stop the Line](../principles/stop-the-line.md) - Failing builds on potential bugs
- [Boy Scout Rule](../principles/boy-scout-rule.md) - Leave code better than you found it

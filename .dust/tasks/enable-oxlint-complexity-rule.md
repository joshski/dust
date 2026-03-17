# Enable oxlint complexity rule

Enable the oxlint `complexity` rule as an error in `.oxlintrc.json` to prevent high cyclomatic complexity in future code.

## Background

The oxlint linter supports a `complexity` rule that reports functions exceeding a cyclomatic complexity threshold. With all existing violations fixed, this rule can be enabled to maintain code quality going forward.

## Implementation

Add the complexity rule to `.oxlintrc.json`:

```json
{
  "jsPlugins": ["./lib/oxlint/plugins/dust.js"],
  "rules": {
    "dust/command-exports-matching-filename": "error",
    "max-depth": ["error", { "max": 4 }],
    "complexity": ["error", { "max": 20 }]
  }
}
```

This uses the default threshold of 20, which is a reasonable balance between allowing necessary branching and catching overly complex functions.

## Principles

- [Lint Everything](../principles/lint-everything.md) - Add complexity checking to lint pipeline
- [Decoupled Code](../principles/decoupled-code.md) - Complexity limits encourage decomposition
- [Make Changes with Confidence](../principles/make-changes-with-confidence.md) - Prevents complexity regressions

## Blocked By

- [Reduce complexity in command functions](reduce-complexity-in-command-functions.md)
- [Reduce complexity in loop functions](reduce-complexity-in-loop-functions.md)
- [Reduce complexity in agent and UI functions](reduce-complexity-in-agent-and-ui-functions.md)

## Definition of Done

- `.oxlintrc.json` includes `"complexity": ["error", { "max": 20 }]`
- `bin/dust check` passes with no complexity errors
- Idea file `.dust/ideas/enable-oxlint-complexity-rules-as-errors.md` is deleted

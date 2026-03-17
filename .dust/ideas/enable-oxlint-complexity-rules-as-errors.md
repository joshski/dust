# Enable oxlint complexity rules as errors

Add complexity checking to the lint pipeline by enabling oxlint's `complexity` rule as an error.

## Research Findings

### Current State

The `dust check` command currently runs oxlint with `-D suspicious`, which catches many issues but does not include the `complexity` rule. Running `bunx oxlint -W complexity .` reveals 13 functions exceeding the default cyclomatic complexity threshold of 20.

### The Warning vs Error Problem

`dust check` only reports failures when a check exits non-zero. oxlint exits 0 when it only finds warnings. This means enabling complexity as a warning (`-W complexity`) would not surface issues through `dust check`.

### Solution Options

There are two ways to surface complexity issues as errors:

1. **Use `-D complexity` flag** - Promotes complexity warnings to errors
2. **Configure in `.oxlintrc.json`** - Add `"complexity": "error"` to rules

Option 2 (config file) is preferred because:
- Keeps the command-line invocation simpler
- Configuration is co-located with other rule settings
- More consistent with how `max-depth` is already configured

### Implementation

Update `.oxlintrc.json`:
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

### Current Violations

13 functions currently exceed complexity of 20. These would need to be either:
- Refactored to reduce complexity
- Excluded with `// eslint-disable-next-line complexity` comments
- Given a higher threshold initially (e.g., `max: 30`) with a plan to reduce

### Historical Context

This idea supersedes "Integrate FTA" which proposed adding a separate tool for complexity analysis. FTA was declined because:
- oxlint's `complexity` rule already provides cyclomatic complexity
- Function-level feedback is more actionable than file-level scores
- FTA's scores correlated too strongly with file size
- Adding another tool increases maintenance burden

## Open Questions

### How should we handle existing violations?

#### Option: Fix violations first

Refactor the 13 functions exceeding complexity 20 before enabling the rule. This ensures a clean slate but delays adoption.

#### Option: Disable per-line initially

Enable the rule as error and add `// eslint-disable-next-line complexity` to the 13 existing violations. This prevents new violations immediately while creating visible technical debt to address.

#### Option: Use higher threshold initially

Set `max: 30` initially to pass checks, then lower progressively. The current violations range from 21-28 complexity.

## Related

- Supports principle: [Lint Everything](../principles/lint-everything.md)
- Supports principle: [Decoupled Code](../principles/decoupled-code.md)

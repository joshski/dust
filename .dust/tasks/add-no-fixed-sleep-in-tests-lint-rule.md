# Add no-fixed-sleep-in-tests Lint Rule

Add an oxlint rule to detect and fail on fixed-duration sleeps in test files.

## Background

Fixed-duration sleeps in tests cause intermittent failures because they rely on timing that varies across environments. Mozilla's [no-arbitrary-setTimeout](https://firefox-source-docs.mozilla.org/code-quality/lint/linters/eslint-plugin-mozilla/rules/no-arbitrary-setTimeout.html) rule documents this pattern.

The dust codebase uses dependency injection for sleep in production code. This rule enforces that pattern in tests.

## Implementation

Add `no-fixed-sleep-in-tests.js` to `lib/oxlint/plugins/` following the pattern of existing rules like `no-thin-delegate-wrappers.js`.

### Detection targets

The rule should detect:

1. **setTimeout with non-zero delay** in `*.test.ts` files:
   - `setTimeout(fn, 100)` - numeric literal > 0
   - `setTimeout(fn, DELAY)` - any non-literal (variable reference)

2. **sleep calls with non-zero delay**:
   - `await sleep(100)` - numeric literal > 0
   - `sleep(DELAY)` - any non-literal

### Allowed patterns

- `setTimeout(fn, 0)` - zero delay for event loop yielding
- `sleep(0)` - zero delay

### Error message

```
Fixed-duration sleep in test file. Use event-based waiting or inject time dependencies.
```

### Registration

Export the rule from `lib/oxlint/plugins/dust.js` as `no-fixed-sleep-in-tests`.

### Configuration

Enable the rule only for test files via oxlint configuration.

## Principles

- [Environment-Independent Tests](../principles/environment-independent-tests.md)
- [Reproducible Checks](../principles/reproducible-checks.md)
- [Dependency Injection](../principles/dependency-injection.md)
- [Lint Everything](../principles/lint-everything.md)

## Blocked By

(none)

## Definition of Done

- Rule detects `setTimeout(fn, N)` where N > 0 or N is a variable
- Rule detects `sleep(N)` where N > 0 or N is a variable
- Rule allows `setTimeout(fn, 0)` and `sleep(0)`
- Rule only applies to `*.test.ts` files
- Rule registered in oxlint plugin
- Unit tests cover all detection patterns
- Existing test violations fixed (use dependency injection for timing)

# Add dots reporter to bun test

Use bun's built-in dots reporter for `bun test` output to reduce verbosity.

Currently `bun test` uses the default console reporter, which prints a line per test. The dots reporter (`--reporter=dots`) prints a single character per test, producing compact output that is easier to scan and consumes fewer tokens when included in agent context.

## Implementation

Create a `bunfig.toml` at the repository root with:

```toml
[test]
reporter = "dots"
```

This configures `bun test` globally without changing any commands in `.dust/config/settings.json` or `package.json`.

### Files to change

- `bunfig.toml` (new file) - Add `[test]` section with `reporter = "dots"`

### Verification

Run `bun test` and confirm output uses dot characters instead of one line per test.

## Goals

- [Fast Feedback](../goals/fast-feedback.md)
- [Context Window Efficiency](../goals/context-window-efficiency.md)

## Blocked By

(none)

## Definition of Done

- [ ] `bunfig.toml` exists at the repository root with `[test]` section setting `reporter = "dots"`
- [ ] `bun test` outputs dots instead of the default verbose format

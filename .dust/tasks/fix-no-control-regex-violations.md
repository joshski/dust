# Fix no-control-regex Violations

Use Unicode escapes instead of control characters in regular expressions to comply with oxlint's `no-control-regex` rule from the suspicious category.

## Context

The `no-control-regex` rule flags 3 violations where regex patterns contain control characters (specifically `\x1b` for ANSI escape sequences). While these patterns are intentional—they match ANSI color codes in terminal output—using raw control characters is discouraged because:
- They're invisible in most editors
- They can be confusing when reading code
- Unicode escapes are more explicit

The violations are in `lib/bucket/terminal-ui.ts` which strips ANSI codes from text.

## Approach

1. Run `bunx oxlint -D suspicious --filter no-control-regex` to list all violations
2. Replace `\x1b` with `\u001b` in the regex patterns
3. Remove the existing biome ignore comments (no longer needed)
4. Run `bin/dust check` to verify tests still pass
5. Run `bunx oxlint -D suspicious --filter no-control-regex` to confirm zero violations

## Principles

- [Lint Everything](../principles/lint-everything.md)
- [Context-Optimised Code](../principles/context-optimised-code.md)

## Blocked By

(none)

## Definition of Done

- [ ] All `\x1b` sequences replaced with `\u001b` in regex patterns
- [ ] Obsolete biome ignore comments removed
- [ ] `bunx oxlint -D suspicious --filter no-control-regex` reports zero violations
- [ ] `bin/dust check` passes

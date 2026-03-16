# Enable max-depth Lint Rule

Enable oxlint's `max-depth` rule to catch deeply nested control flow that obscures the happy path.

## Context

The [Lint Everything](../principles/lint-everything.md) principle favours static analysis over periodic audits. The `max-depth` rule catches mechanical nesting depth violations automatically during `dust check`, providing instant feedback without agent context.

## Implementation

1. Add `max-depth` rule to `.oxlintrc.json`:
   ```json
   {
     "rules": {
       "max-depth": ["error", { "max": 4 }]
     }
   }
   ```

2. Fix the 4 existing violations at depth 5:
   - `lib/proxy/claude-api-proxy.ts:301` - refactor stream reading loop
   - `lib/proxy/git-credential-proxy.ts:269` - refactor stream reading loop
   - `lib/lint/validators/principle-hierarchy.ts:68` - extract nested conditional
   - `lib/lint/validators/link-validator.ts:61` - extract nested conditional

## Principles

- [Lint Everything](../principles/lint-everything.md) - static analysis catches errors before runtime
- [Stop the Line](../principles/stop-the-line.md) - violations should block, not warn
- [Fast Feedback Loops](../principles/fast-feedback-loops.md) - lint provides instant feedback

## Blocked By

(none)

## Definition of Done

- [ ] `max-depth` rule added to `.oxlintrc.json` with threshold 4 and error severity
- [ ] All existing violations are fixed (no new violations introduced)
- [ ] `bin/dust check` passes

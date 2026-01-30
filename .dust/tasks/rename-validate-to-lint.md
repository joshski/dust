# Rename `dust validate` to `dust lint`

The command name "validate" is ambiguous - it's not clear what is being validated. The term "lint" is well-understood by developers and parallels common tooling (eslint, markdownlint, etc.).

## Goals

- [Clarity over brevity](../goals/clarity-over-brevity.md)

## Blocked by

None

## Known locations to update

These were found by searching for "validate" in the codebase. The implementor should double-check for any additional occurrences.

### Core implementation
- `lib/cli/commands/validate.ts` → rename to `lint.ts`
- `lib/cli/commands/validate.test.ts` → rename to `lint.test.ts`
- `lib/cli/main.ts` - imports and exports validate command
- `lib/cli/entry-wiring.ts` - imports GlobScanner type from validate

### Check command integration
- `lib/cli/commands/check.ts` - imports validate, calls it, names result 'validate'
- `lib/cli/commands/check.test.ts` - tests for '✓ validate' and '✗ validate' output

### Main command tests
- `lib/cli/main.test.ts` - tests routing of validate command

### Help and templates
- `lib/templates/help.txt` - command list and examples
- `lib/templates/agent-help.txt` - agent documentation
- `lib/templates/agent-new-idea.txt` - suggests running validate
- `lib/templates/agent-new-task.txt` - suggests running validate
- `lib/templates/agent-new-goal.txt` - suggests running validate

### Documentation and facts
- `README.md` - shows "✓ validate" in output example
- `.dust/facts/unified-cli.md` - documents the command
- `.dust/facts/configuration-system.md` - mentions dust validate

### Other dust files referencing validate
- `.dust/tasks/enforce-opening-sentences.md` - mentions validate.ts
- `.dust/ideas/stale-idea-detection.md` - suggests integration with validate
- `.dust/ideas/periodic-health-check-hook.md` - suggests running validate

## Internal function names

Keep internal function names like `validateFilename`, `validateLinks`, `validateSemanticLinks`, `validateTaskHeadings` as-is. These are internal implementation details and "validate" accurately describes what they do. Only the public command name needs to change.

## Definition of done

- [ ] Command renamed from `validate` to `lint`
- [ ] All file references updated (double-check with `grep -r validate`)
- [ ] All tests pass
- [ ] `dust lint` works correctly
- [ ] `dust check` output shows `✓ lint` instead of `✓ validate`

# Move template-command.ts to lib/cli/

The `lib/cli/commands/` directory should contain only actual command implementations. Currently it includes `template-command.ts`, which is a utility/factory file rather than a command.

## Current state

- `lib/cli/commands/template-command.ts` - factory function for creating template-based commands
- Used by agent commands to render templates with standard variables

## Changes required

1. Move `lib/cli/commands/template-command.ts` to `lib/cli/template-command.ts`
2. Update all imports that reference the old path

## Goals

- [Organized Concerns](../goals/organized-concerns.md)

## Blocked by

(none)

## Definition of done

- [ ] `template-command.ts` is located at `lib/cli/template-command.ts`
- [ ] All imports are updated to use the new path
- [ ] All tests pass
- [ ] `lib/cli/commands/` contains only actual command implementations and their tests

# Add dust core principle Command

Implement `dust core principle <name>` command to display individual core principles from the bundled package.

## Context

After bundling core principles into JavaScript, users will no longer be able to navigate to the principles directory in `node_modules` to read them. This command provides a way to view individual core principles through the CLI.

## Implementation Approach

1. Add a new `core` command group to the CLI
2. Implement `dust core principle <name>` subcommand that:
   - Takes a principle slug as argument
   - Loads the principle from the bundled core principles
   - Displays the principle content with appropriate formatting
   - Shows a helpful error if the principle doesn't exist
3. Update the CLI help text to include the new command
4. Add tests for the new command

## Principles

- [Unsurprising UX](../principles/unsurprising-ux.md)
- [Batteries Included](../principles/batteries-included.md)
- [Actionable Errors](../principles/actionable-errors.md)

## Task Type

implement

## Blocked By

- [Bundle Core Principles as JavaScript Module](bundle-core-principles-as-javascript-module.md)

## Definition of Done

- `dust core principle <slug>` displays the requested core principle
- Command shows helpful error message if principle doesn't exist
- Command is documented in `dust help` output
- Tests verify command works correctly
- Command follows existing CLI patterns and formatting

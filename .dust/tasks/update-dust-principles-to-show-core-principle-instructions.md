# Update dust principles to Show Core Principle Instructions

Update the `dust principles` command to show instructions for accessing core principles via `dust core principle <name>`. This replaces displaying the file system path.

## Context

After bundling core principles into JavaScript, the file system path shown by `dust principles` will no longer be meaningful to users. Instead, the command should teach users how to view individual core principles using the new `dust core principle <name>` command.

## Implementation Approach

1. Update `lib/cli/commands/list.ts` around line 503 where it shows `🎯 Core Principles (${corePath})`
2. Change the header to something like `🎯 Core Principles (use: dust core principle <name>)`
3. Remove the call to `getCorePrinciplesPath()` since it's no longer needed
4. Update tests to verify the new output format
5. Ensure the change maintains alignment with local principles section

## Principles

- [Unsurprising UX](../principles/unsurprising-ux.md)
- [Progressive Disclosure](../principles/progressive-disclosure.md)
- [Agent Context Inference](../principles/agent-context-inference.md)

## Task Type

implement

## Blocked By

- [Bundle Core Principles as JavaScript Module](bundle-core-principles-as-javascript-module.md)
- [Add dust core principle Command](add-dust-core-principle-command.md)

## Definition of Done

- `dust principles` shows instructions instead of file path for core principles
- The instructions clearly indicate how to view individual core principles
- Tests verify the new output format
- Output remains well-formatted and aligned
- `getCorePrinciplesPath()` is no longer called from the principles command

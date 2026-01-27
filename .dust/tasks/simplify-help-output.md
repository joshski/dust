# Simplify help output

Remove the Agent Guide section from `dust help` and replace it with a simple instruction to run `dust agent` for agent-specific guidance.

Currently `lib/templates/help.txt` includes the full Agent Guide (lines 23-80), which duplicates information available via `dust agent`. This violates progressive disclosure - the help command should be concise and point users to more detailed commands when needed.

## Goals

- [Progressive Disclosure](../goals/progressive-disclosure.md)
- [Context Window Efficiency](../goals/context-window-efficiency.md)

## Blocked by

(none)

## Definition of done

- [ ] Remove the Agent Guide section from `lib/templates/help.txt` (lines 23-80)
- [ ] Add a brief note after the examples pointing to `dust agent` for agent-specific guidance
- [ ] Update the "Configuring Agent Files" example in `lib/templates/agent-help.txt` to reference `dust agent` instead of `dust help`
- [ ] All tests pass (`bin/dust check`)

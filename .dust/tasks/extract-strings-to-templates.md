# Extract Strings to Templates

Move large text strings (like command outputs and help text) from TypeScript code into separate text files or templates.

## Goals

- [Small Units](../goals/small-units.md)
- [Decoupled Code](../goals/decoupled-code.md)
- [Context Window Efficiency](../goals/context-window-efficiency.md)

## Blocked by

(none)

## Definition of done

- [ ] Large text strings in TypeScript are identified
- [ ] Text files created in an appropriate location (e.g., `lib/templates/`)
- [ ] TypeScript code reads from text files instead of inline strings
- [ ] Templates support variable interpolation where needed
- [ ] All existing commands work identically
- [ ] `bin/dust check` passes

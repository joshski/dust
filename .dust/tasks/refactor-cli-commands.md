# Refactor CLI commands

Replace the switch/case command handling in `lib/cli/main.ts` with an object-based command registry.

## Goals

- [Decoupled Code](../goals/decoupled-code.md)
- [Small Units](../goals/small-units.md)

## Blocked by

(none)

## Definition of done

- [ ] Commands are defined as an object/class with methods corresponding to command names
- [ ] The switch/case statement is eliminated
- [ ] Help text is generated from the command registry
- [ ] All existing commands work identically
- [ ] `bin/dust check` passes

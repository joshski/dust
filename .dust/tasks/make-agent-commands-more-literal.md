# Make agent commands more literal

Restructure agent CLI commands from single-word subcommands to more explicit verb-noun patterns:

**Current structure:**
- `dust agent task` - Create a new task
- `dust agent goal` - Understanding goals
- `dust agent work` - Pick a task to work on
- `dust agent implement` - Implementation instructions

**Proposed structure:**
- `dust agent new task` - Create a new task
- `dust agent new goal` - Create a new goal
- `dust agent implement task` - Implementation instructions
- `dust agent understand goal` - Understanding goals

This makes the commands more self-documenting and explicit about what action is being taken.

## Technical Analysis

### Files Requiring Changes

**Critical (core logic):**
- `lib/cli/commands/agent.ts` - Expand subcommand parsing from single to two arguments. The current switch statement (lines 29-62) and AGENT_SUBCOMMANDS constant (lines 10-17) would need restructuring for verb-noun parsing
- `lib/cli/commands/agent.test.ts` - Major rewrite of ~40+ test assertions expecting old format

**High impact (user-facing templates):**
- `lib/templates/agent-greeting.txt` - Update routing instructions (lines 7-12)
- `lib/templates/agent-work.txt` - Update command references
- `lib/templates/agent-implement.txt` - Update command references
- `lib/templates/agent-task.txt` - Update command references
- `lib/templates/agent-goal.txt` - Update command references
- `lib/templates/agent-idea.txt` - Update command references
- `lib/templates/agent-help.txt` - Update all command examples

**Medium impact (tests and docs):**
- `lib/cli/commands/init.test.ts` - Tests for generated agent instructions
- `lib/cli/main.test.ts` - Integration tests (lines 280-291)
- `README.md` - Documentation examples (lines 45-52)
- `AGENTS.md` - Agent instructions example (line 5)

**Low impact (internal docs):**
- `.dust/facts/unified-cli.md` - Project documentation (line 10)

### Design Considerations

1. **Backward compatibility** - Should old commands still work during a transition period?
2. **Error messages** - What happens if user types `dust agent task` instead of `dust agent new task`?
3. **Discoverability** - How do we communicate the new structure to existing users?
4. **Template naming** - Should template files be renamed to match new structure (e.g., `agent-new-task.txt`)?

## Goals

- [Clarity Over Brevity](../goals/clarity-over-brevity.md)

## Blocked by

(none)

## Definition of done

- [ ] Design final command structure (decide on verb-noun combinations)
- [ ] Update `lib/cli/commands/agent.ts` to parse two-argument subcommands
- [ ] Update all 7 agent template files with new command references
- [ ] Update `lib/cli/commands/agent.test.ts` with new test cases
- [ ] Update `lib/cli/main.test.ts` integration tests
- [ ] Update `lib/cli/commands/init.test.ts` for generated instructions
- [ ] Update documentation (`README.md`, `AGENTS.md`, `.dust/facts/unified-cli.md`)
- [ ] All tests pass (`npm test`)
- [ ] Validation passes (`bin/dust validate`)

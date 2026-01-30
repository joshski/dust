# Add type explanations to dust list commands

Before listing instances of each type, the `dust list` commands should output a brief explanation of what that type represents in the dust system.

## Current behavior

```
$ bin/dust list tasks

📋 Tasks

# Rename loop command to loop claude
...
```

## Desired behavior

```
$ bin/dust list tasks

📋 Tasks

Tasks are detailed work plans with dependencies and completion criteria. Each task describes a specific piece of work to be done.

# Rename loop command to loop claude
...
```

## Type explanations to add

- **Tasks**: Detailed work plans with dependencies and completion criteria. Each task describes a specific piece of work to be done.
- **Ideas**: Future feature notes and proposals. Ideas capture possibilities that haven't yet been refined into actionable tasks.
- **Goals**: Mission statements and guiding principles. Goals describe desired outcomes and values that inform decision-making.
- **Facts**: Current state documentation. Facts capture how things work today, providing context for agents and contributors.

## Implementation notes

The explanations should be added to `lib/cli/commands/list.ts`, similar to how `SECTION_HEADERS` is structured. The explanation should appear after the section header and before the first item in the list.

## Goals

- [Context Window Efficiency](../goals/context-window-efficiency.md)
- [Agent Autonomy](../goals/agent-autonomy.md)

## Blocked by

(none)

## Definition of done

- [ ] Each `dust list <type>` command outputs a brief explanation after the header
- [ ] Explanations help agents and humans understand what each type represents
- [ ] Tests verify the explanations appear in output

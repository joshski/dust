# Simplify Agent Command Prefix

Remove the `agent` prefix from agent commands.

Since almost all dust commands are designed for agents, the `agent` prefix is redundant. For example:

- `dust agent pick task` → `dust pick task`
- `dust agent new task` → `dust new task`
- `dust agent implement task` → `dust implement task`

This would make the CLI more concise while maintaining clarity.

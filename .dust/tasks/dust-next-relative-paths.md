# Show relative paths in `dust next`

The `dust next` command currently shows just the task name (e.g., "add-task-instructions"). It should show the relative path to the markdown file instead (e.g., ".dust/tasks/add-task-instructions.md") so agents and humans can easily navigate to the file.

## Goals

- [Agent Context Inference](../goals/agent-context-inference.md)

## Blocked by

(none)

## Definition of done

- [ ] Modify `dust next` to display relative paths instead of just names
- [ ] All tests pass

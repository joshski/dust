# Split agent tasks into focused commands

The `agent-tasks.txt` template currently handles three distinct activities: implementing tasks, adding tasks from scratch, and converting ideas into tasks. This creates duplication with `agent-work.txt` (which also describes implementation) and forces agents to parse irrelevant sections.

Split into focused commands that each do one thing:
- `agent work` - implement a task (already exists, no change)
- `agent task` - create a task (whether from scratch or inspired by an existing idea)

When creating a task, the agent must check all existing ideas to determine if any should be:
- **Deleted** - if the new task fully covers the idea
- **Updated** - if the idea's scope changes as a result of the task

This eliminates the need for separate "add-task" and "flesh-out" commands. Users simply say "Task: ..." and the agent handles idea cleanup automatically.

Also optimize `agent-greeting.txt` to be a scannable numbered list (not a table) that makes it clear the agent should choose ONE option. The greeting should acknowledge that users may use terse prompts like "work" or "task: ...".

## Goals

- [Context Window Efficiency](../goals/context-window-efficiency.md)
- [Progressive Disclosure](../goals/progressive-disclosure.md)

## Blocked by

(none)

## Definition of done

- [ ] Create `agent-task.txt` with instructions for creating a task, including checking all ideas for deletion/update
- [ ] Remove "Implementing a Task" and "Converting an Idea" sections from `agent-tasks.txt` (or remove the file entirely if only listing remains)
- [ ] Update `agent-greeting.txt` to a numbered list format that clearly indicates "choose ONE"
- [ ] Greeting explicitly handles terse prompts (e.g., "work", "task: ...")
- [ ] Update `agent-ideas.txt` to explain that ideas may be auto-deleted/updated when tasks are created
- [ ] Update `agent-help.txt` to list the new command
- [ ] Add `task` subcommand to the CLI
- [ ] All tests pass

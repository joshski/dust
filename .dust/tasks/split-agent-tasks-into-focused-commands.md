# Split agent tasks into focused commands

The `agent-tasks.txt` template currently handles three distinct activities: implementing tasks, adding tasks from scratch, and converting ideas into tasks. This creates duplication with `agent-work.txt` (which also describes implementation) and forces agents to parse irrelevant sections.

Split into focused commands that each do one thing:
- `agent work` - implement a task (already exists, no change)
- `agent add-task` - create a task from scratch
- `agent flesh-out` - convert an idea into a task

Also optimize `agent-greeting.txt` to be a scannable "pick one" decision table rather than verbose example phrases. The greeting should acknowledge that users may use extremely terse prompts like "work" or "flesh out <idea-name>".

## Goals

- [Context Window Efficiency](../goals/context-window-efficiency.md)
- [Progressive Disclosure](../goals/progressive-disclosure.md)

## Blocked by

(none)

## Definition of done

- [ ] Create `agent-add-task.txt` with instructions for creating a task from scratch
- [ ] Create `agent-flesh-out.txt` with instructions for converting an idea to a task
- [ ] Remove "Implementing a Task" and "Converting an Idea" sections from `agent-tasks.txt` (or remove the file entirely if only listing remains)
- [ ] Update `agent-greeting.txt` to a compact table format routing to the new commands
- [ ] Greeting explicitly handles terse prompts (e.g., "work", "flesh out <idea-name>")
- [ ] Update `agent-ideas.txt` to reference `agent flesh-out` instead of `agent tasks`
- [ ] Update `agent-help.txt` to list the new commands
- [ ] Add new subcommands to the CLI (`add-task`, `flesh-out`)
- [ ] All tests pass

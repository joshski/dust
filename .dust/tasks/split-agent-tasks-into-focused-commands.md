# Split agent tasks into focused commands

The `agent-tasks.txt` template currently handles three distinct activities: implementing tasks, adding tasks from scratch, and converting ideas into tasks. This creates duplication with `agent-work.txt` (which also describes implementation) and forces agents to parse irrelevant sections.

Split into focused commands that each do one thing:
- `agent work` - pick the next task to work on, then directs to `agent implement`
- `agent implement` - implement a task (check, implement, commit atomically)
- `agent task` - create a task (whether from scratch or inspired by an existing idea)

When creating a task, the agent must check all existing ideas to determine if any should be:
- **Deleted** - if the new task fully covers the idea
- **Updated** - if the idea's scope changes as a result of the task

This eliminates the need for separate "add-task" and "flesh-out" commands. Users simply say "Task: ..." and the agent handles idea cleanup automatically.

Also optimize `agent-greeting.txt` to be a scannable numbered list (not a table) that makes it clear the agent should choose ONE option. The greeting should acknowledge that users may use terse prompts like "work" or "task: ...".

### Exact new `agent-work.txt`

```
## Pick a Task

Follow these steps:

1. Run `{{bin}} next` to see available tasks
2. Pick ONE task and read its file to understand the requirements
3. Run `{{bin}} agent implement` for instructions about how to implement
```

### Exact new `agent-implement.txt`

```
## Implement a Task

Follow these steps:

1. Run `{{bin}} check` to verify the project is in a good state
2. Implement the task
3. Run `{{bin}} check` before committing
4. Create a single atomic commit that includes:
   - All implementation changes
   - Deletion of the completed task file
   - Updates to any facts that changed
   - Deletion of any ideas that were fully realized

Keep your change small and focused. One task, one commit.
```

### Exact new `agent-task.txt`

```
## Adding a New Task

Follow these steps:

1. Run `{{bin}} list ideas` to see all existing ideas
2. Determine which ideas (if any) should be:
   - **Deleted** - if the new task fully covers the idea
   - **Updated** - if the idea's scope changes as a result of the task
3. Create a new markdown file in `.dust/tasks/` with a descriptive kebab-case name (e.g., `add-user-authentication.md`)
4. Add a title as the first line using an H1 heading (e.g., `# Add user authentication`)
5. Write a comprehensive description of what needs to be done with technical details and references to relevant files
6. Add a `## Goals` section with links to relevant goals this task supports (e.g., `- [Goal Name](../goals/goal-name.md)`)
7. Add a `## Blocked by` section listing any tasks that must complete first, or `(none)` if there are no blockers
8. Add a `## Definition of done` section with a checklist of completion criteria using `- [ ]` for each item
9. Run `{{bin}} validate` to catch any issues with the task format
10. Create a single atomic commit with a message in the format "Add task: <title>" that includes:
    - The new task file
    - Deletion of any ideas that were fully realized
    - Updates to any ideas whose scope changed
```

### Exact new `agent-greeting.txt`

```
Hello Agent, welcome to dust!

Your goal is to make ONE SMALL CHANGE and then commit and push.

Based on what the user asked, pick ONE command to run:

1. "work", "go", "pick a task" → `{{bin}} agent work`
2. "implement [task name]" → `{{bin}} agent implement`
3. "task: ..." or "add a task ..." → `{{bin}} agent task`
4. "goal: ..." or "add a goal ..." → `{{bin}} agent goal`
5. A vague idea about a potential change → `{{bin}} agent idea`
6. Anything else → `{{bin}} agent help`
```

## Goals

- [Context Window Efficiency](../goals/context-window-efficiency.md)
- [Progressive Disclosure](../goals/progressive-disclosure.md)

## Blocked by

(none)

## Definition of done

- [ ] Create `agent-implement.txt` with the exact text specified above
- [ ] Create `agent-task.txt` with the exact text specified above
- [ ] Update `agent-work.txt` to the exact text specified above (delegates to `agent implement`)
- [ ] Delete `agent-tasks.txt` (no longer needed)
- [ ] Update `agent-greeting.txt` to the exact text specified above
- [ ] Rename `agent-ideas.txt` to `agent-idea.txt` and update to explain that ideas may be auto-deleted/updated when tasks are created
- [ ] Rename `agent-goals.txt` to `agent-goal.txt`
- [ ] Update `agent-help.txt` to list the new commands with singular names
- [ ] Update CLI to add `implement` and use singular subcommands: `task`, `goal`, `idea` (replacing `tasks`, `goals`, `ideas`)
- [ ] All tests pass

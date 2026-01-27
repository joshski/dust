# Add step-by-step instructions for adding a task

Add a new section to `lib/templates/agent-tasks.txt` that provides step-by-step instructions for adding a new task, similar to the existing "Implementing a Task" section.

## Goals

- [Progressive Disclosure](../goals/progressive-disclosure.md)
- [Easy Adoption](../goals/easy-adoption.md)

## Blocked by

(none)

## Definition of done

- [ ] Add a new "## Adding a Task" section to `lib/templates/agent-tasks.txt`
- [ ] Include step-by-step instructions for creating a task file
- [ ] End with running `{{bin}} validate` to catch any issues with the task without requiring project dependencies to be installed
- [ ] All tests pass

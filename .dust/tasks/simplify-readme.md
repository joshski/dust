# Simplify README

Remove detail from the README.md to make it more concise and focused on the core concepts.

## Goals

- [Context Window Efficiency](../goals/context-window-efficiency.md)
- [Easy Adoption](../goals/easy-adoption.md)

## Blocked by

(none)

## Definition of done

- Everything from "CLI Commands" downwards has been removed from README.md
- The "Workflow" section has been simplified to explain:
  - Progress is tracked via changes to markdown files in the `.dust/` directory
  - Commits to code usually coincide with the deletion of tasks (removing work from the queue for subsequent agents)
  - The `tasks/` directory acts as a "work queue"
  - The four directories together (`goals/`, `ideas/`, `tasks/`, `facts/`) act as a "kanban system"
- The README remains clear and understandable for new users

# Task File Format

Task files in `.dust/tasks/` must follow a specific structure.

## Required Headings

Every task file must contain these three headings in any order:

- `## Goals` - Links to goal documents this task supports
- `## Blocked by` - Links to tasks that must complete first (can be empty)
- `## Definition of done` - Criteria for determining task completion

## Naming Convention

Task filenames must use slug-style naming:
- Lowercase alphanumeric characters and hyphens only
- No spaces, underscores, or special characters
- Should reflect the task intent (e.g., `implement-task-linter.md`)

## Links

All links to other Dust documents should be relative markdown links. The link text should match the title of the target document.

# Implement dust next command

Add a `dust next` command that lists tasks from `.dust/tasks/` that are not blocked by any other incomplete tasks.

The command should:
- Parse each task file to extract the `## Blocked by` section
- Resolve task references to determine which tasks are blocked
- Output only tasks where all blocking tasks are completed (or the task has no blockers)
- Follow the existing CLI command pattern used by `list.ts`

## Goals

- [Human-AI Collaboration](../goals/human-ai-collaboration.md)
- [Fast Feedback](../goals/fast-feedback.md)
- [Lightweight Planning](../goals/lightweight-planning.md)

## Blocked by

(none)

## Definition of done

- `lib/cli/next.ts` exists and exports a `next` function matching the command interface
- The command reads all markdown files from `.dust/tasks/`
- The command parses `## Blocked by` sections to identify dependencies
- Tasks with no blockers or only completed blockers are displayed
- The command returns exit code 0 on success
- The command returns exit code 1 if `.dust` directory is not found

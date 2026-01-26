# Claude Code Instructions

This repository uses [Dust](https://github.com/joshka/dust), a lightweight planning system for human-AI collaboration.

## Directory Structure

The `.dust/` directory contains all planning artifacts:

- **`.dust/goals/`** - Mission statements and guiding principles
- **`.dust/ideas/`** - Future feature notes and proposals (intentionally vague)
- **`.dust/tasks/`** - Detailed work plans with dependencies and definitions of done
- **`.dust/facts/`** - Documentation of current system state and architecture

All files are markdown with slug-style names (lowercase, hyphens, no spaces).

## Working on Tasks

To find available work, check `.dust/tasks/`. Each task file contains:

- `## Goals` - Links to goals this task supports
- `## Blocked by` - Tasks that must complete first (empty or "(none)" means ready to start)
- `## Definition of done` - Criteria for completion

A task is **unblocked** if its `## Blocked by` section is empty, says "(none)", or all referenced task files have been deleted.

## Completing a Task

When finishing a task, create a single atomic commit that includes:

1. All implementation changes
2. Deletion of the completed task file
3. Updates to any facts that changed
4. Deletion of any ideas that were fully realized

## Common Workflows

The `prompts/` directory contains workflow prompts:

- **`prompts/work.md`** - Select and implement an unblocked task
- **`prompts/idea-to-tasks.md`** - Convert an idea into actionable tasks
- **`prompts/validate-facts.md`** - Check that facts match the codebase

## Quick Commands

- "Work on the next task" - Find an unblocked task and implement it
- "Work on task X" - Implement the specific task in `.dust/tasks/X.md`
- "Convert idea Y to tasks" - Break down `.dust/ideas/Y.md` into tasks
- "Validate facts" - Check all facts for accuracy

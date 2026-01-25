# Idea to Task Prompt

A prompt under `prompts/` that guides the transformation of an idea into one or more actionable tasks.

## What the Prompt Should Cover

- Reading and understanding an idea from `.dust/ideas/`
- Breaking the idea down into discrete, implementable tasks
- Creating task files that follow the [Task File Format](../facts/task-file-format.md)
- Establishing proper dependencies between tasks via `## Blocked by`
- Linking tasks to relevant goals via `## Goals`
- Writing clear, testable definitions of done

## Task File Structure Reference

Each generated task file must include:

- `## Goals` - Links to goal documents the task supports
- `## Blocked by` - Links to tasks that must complete first (or "(none)")
- `## Definition of done` - Concrete criteria for completion

Task filenames should use slug-style naming (lowercase, hyphenated).

## Rationale

Ideas are often vague or broad. Having a structured process for converting them into well-defined tasks ensures:
- Ideas become actionable
- Dependencies are explicit
- Completion criteria are clear
- Work can be picked up by the [work](../../prompts/work.md) prompt

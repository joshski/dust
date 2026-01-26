# Create Idea to Task Prompt

Create a prompt under `prompts/` that guides the transformation of ideas into actionable tasks.

## Goals

- [Human-AI Collaboration](../goals/human-ai-collaboration.md)
- [Lightweight Planning](../goals/lightweight-planning.md)

## Blocked by

(none)

## Definition of done

A new file `prompts/idea-to-tasks.md` exists that instructs an AI agent to:

- Read and understand an idea from `.dust/ideas/`
- Break the idea into one or more discrete, implementable tasks
- Create task files following the [Task File Format](../facts/task-file-format.md)
- Establish proper dependencies between tasks via `## Blocked by`
- Link tasks to relevant goals via `## Goals`
- Write clear, testable definitions of done
- Delete the original idea file
- Make a single atomic commit containing the new task(s) and the idea deletion

The prompt should reference the existing [work](../../prompts/work.md) prompt as the next step after task creation.

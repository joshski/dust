# Improve createCaptureIdeaTask Clarity

Change `createCaptureIdeaTask` in `lib/workflow-tasks.ts` so that agents picking up the generated task understand exactly what to do.

## Current Problem

The current function takes a single `description` string and produces a task titled "Capture Idea" with vague instructions. An agent picking up the task sees no clear title for the idea and no specific file path to create.

## Required Changes

### 1. Change the function signature

Replace the single `description` parameter with separate `title` and `description` parameters:

```ts
export async function createCaptureIdeaTask(
  fileSystem: FileSystem,
  dustPath: string,
  title: string,
  description: string
): Promise<CreateIdeaTransitionTaskResult>
```

Both `title` and `description` must be non-empty and non-whitespace-only (throw an error otherwise, as the current code already does for `description`).

### 2. Use the title in the task name

The generated task title should be `Add Idea: <title>`, e.g. `Add Idea: Progress Broadcasting`. The filename is derived from this title via `titleToFilename`.

### 3. Improve the task body

The opening sentence should instruct the agent to create an idea file at a specific path. Use `titleToFilename(title)` (not the full task title) to derive the idea filename. For example, if title is "Progress Broadcasting":

```
Create a new idea file at `.dust/ideas/progress-broadcasting.md` with the title "Progress Broadcasting" and the following description:
```

Followed by the `description` text.

### 4. Update the definition of done

Replace the current checklist items with:
- `Idea file exists at .dust/ideas/<slug>.md`
- `Idea file has an H1 title matching "<title>"`

### 5. Update tests

Update `lib/workflow-tasks.test.ts` to match the new signature and assertions:

- The main test should pass both `title` and `description`, and verify:
  - `result.filePath` ends with the slug derived from `Add Idea: <title>`
  - The written content contains `# Add Idea: <title>`
  - The written content contains the specific idea file path
  - The written content contains the description
- Add a test that throws if `title` is empty
- Add a test that throws if `title` is whitespace-only
- Keep the existing tests for empty/whitespace `description`

### 6. Update the facts file

Update `.dust/facts/workflow-tasks.md` line 10 to reflect the new signature: `createCaptureIdeaTask(fileSystem, dustPath, title, description)`.

## Goals

- [Agent Autonomy](../goals/agent-autonomy.md)
- [Clarity Over Brevity](../goals/clarity-over-brevity.md)
- [Context Window Efficiency](../goals/context-window-efficiency.md)

## Blocked By

(none)

## Definition of Done

- [ ] `createCaptureIdeaTask` accepts separate `title` and `description` parameters
- [ ] Generated task title is `Add Idea: <title>`
- [ ] Generated task body tells the agent exactly which file to create under `.dust/ideas/`
- [ ] Tests pass for the new signature and output
- [ ] Facts file is updated

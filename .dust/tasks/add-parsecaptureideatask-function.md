# Add parseCaptureIdeaTask function

Add a new function to `lib/workflow-tasks.ts` that parses a capture idea task file and extracts the idea title and description. This enables downstream UIs to reliably retrieve the user-entered content.

The function should:
- Read the task file at `${dustPath}/tasks/${taskSlug}.md`
- Verify it's a capture idea task (title starts with "Add Idea: ")
- Extract the title from the H1 (stripping the "Add Idea: " prefix)
- Extract the raw markdown content from the `## Idea Description` section
- Return `null` if the file doesn't exist or isn't a capture idea task

## Interface

```typescript
export interface ParsedCaptureIdeaTask {
  ideaTitle: string
  ideaDescription: string
}

export async function parseCaptureIdeaTask(
  fileSystem: FileSystem,
  dustPath: string,
  taskSlug: string
): Promise<ParsedCaptureIdeaTask | null>
```

## Design Decisions

- Return raw markdown content (not normalized) - downstream consumers handle any parsing
- Keep separate from `findAllCaptureIdeaTasks` (single responsibility)
- Return `null` for old-format tasks that lack the `## Idea Description` heading

## Goals

- [Lint Everything](../goals/lint-everything.md)

## Blocked By

- [Update capture idea task format to use Idea Description heading](update-capture-idea-task-format-to-use-idea-description-heading.md)

## Definition of Done

- [ ] `parseCaptureIdeaTask` function is exported from `lib/workflow-tasks.ts`
- [ ] Function extracts title and description from new-format tasks
- [ ] Function returns `null` for non-existent files
- [ ] Function returns `null` for non-capture-idea tasks
- [ ] Function returns `null` for old-format tasks without `## Idea Description`
- [ ] Unit tests cover happy path and edge cases
- [ ] `bin/dust check` passes

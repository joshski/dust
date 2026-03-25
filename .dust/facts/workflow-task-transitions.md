# Workflow Task Transitions

Transition tasks operate on an existing idea. The task type is determined by a `## Task Type` section containing one of: `refine`, `decompose`, or `shelve`.

`createRefineIdeaTask(...)` accepts optional `openQuestionResponses` and renders a `## Resolved Questions` section when provided with one or more responses.

## Task Types and Filenames

All transition tasks include a `## Task Type` section:

- `## Task Type\n\nrefine` -> `refine-idea-<idea-title>.md`
- `## Task Type\n\ndecompose` -> `decompose-idea-<idea-title>.md`
- `## Task Type\n\nshelve` -> `shelve-idea-<idea-title>.md`

Title prefixes like `Refine Idea:`, `Decompose Idea:`, etc. are optional conventions for human readability but are not used for type detection.

Filename generation uses `titleToFilename(...)`:
- Lowercases text
- Converts dots to hyphens
- Removes unsupported characters
- Collapses repeated hyphens

Example:
- Title: `Decompose Idea: API v2.1 Rollout`
- Task type section: `## Task Type\n\ndecompose`
- Filename: `decompose-idea-api-v2-1-rollout.md`

## Linking to an Idea

Association uses back-reference sections to link tasks to ideas.

`findWorkflowTaskForIdea({ ideaSlug })` scans each task for these sections:
- `## Refines Idea`
- `## Decomposes Idea`
- `## Shelves Idea`

Then it extracts the first markdown link in that section.

Example:
- Section content includes link text `API v2.1 Rollout` targeting path `../ideas/api-v2-1-rollout.md`.
- Extracted `ideaSlug`: `api-v2-1-rollout`

If found, the method returns:

```ts
{ type: "decompose", ideaSlug: "api-v2-1-rollout", taskSlug: "decompose-idea-api-v2-1-rollout" }
```

If the idea file does not exist, it throws. If no matching section link is found, it returns `null`.

## Validation Rules

`lib/lint/validators/idea-validator.ts` validates that:

1. The task has a `## Task Type` section with a valid type (`refine`, `decompose`, or `shelve`).
2. The required operation section exists (`Refines/Decomposes/Shelves Idea`).
3. The operation section links to an existing idea file.

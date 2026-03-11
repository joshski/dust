# Workflow Task Transitions

Transition tasks operate on an existing idea and use `IDEA_TRANSITION_PREFIXES`.

`createRefineIdeaTask(...)` accepts optional `openQuestionResponses` and renders a `## Resolved Questions` section when provided with one or more responses.

## Prefixes and Filenames

- `Refine Idea: <Idea Title>` -> `refine-idea-<idea-title>.md`
- `Decompose Idea: <Idea Title>` -> `decompose-idea-<idea-title>.md`
- `Shelve Idea: <Idea Title>` -> `shelve-idea-<idea-title>.md`

Filename generation uses `titleToFilename(...)`:
- Lowercases text
- Converts dots to hyphens
- Removes unsupported characters
- Collapses repeated hyphens

Example:
- Title: `Decompose Idea: API v2.1 Rollout`
- Filename: `decompose-idea-api-v2-1-rollout.md`

## Linking to an Idea

Association is section-based, not title-based.

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
{ type: "decompose-idea", ideaSlug: "api-v2-1-rollout", taskSlug: "decompose-idea-api-v2-1-rollout" }
```

If the idea file does not exist, it throws. If no matching section link is found, it returns `null`.

## Validation Rules

`lib/lint/validators/idea-validator.ts` validates that:

1. The idea title after a transition prefix maps to an existing `.dust/ideas/*.md` file.
2. The required operation section exists (`Refines/Decomposes/Shelves Idea`).
3. The operation section links to an existing idea file.

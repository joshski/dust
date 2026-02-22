# Add body sections to workflow task creation

Update the workflow task creation functions to include explicit body sections that link to the target idea. Each task type gets its own section heading:

- `## Refines Idea` for refine tasks
- `## Decomposes Idea` for decompose tasks
- `## Shelves Idea` for shelve tasks

The section contains a markdown link to the idea file, following the same pattern used for `## Principles` and `## Blocked By`. Title prefixes are retained for human readability.

Update `renderTask` and `createIdeaTask` in `lib/artifacts/workflow-tasks.ts` to accept an idea section parameter specifying the heading and link.

## Principles

- [Clarity Over Brevity](../principles/clarity-over-brevity.md)

## Blocked By

(none)

## Definition of Done

- [ ] `createRefineIdeaTask` includes `## Refines Idea` section with link to the target idea
- [ ] `decomposeIdea` includes `## Decomposes Idea` section with link to the target idea
- [ ] `createShelveIdeaTask` includes `## Shelves Idea` section with link to the target idea
- [ ] Unit tests verify the new sections appear in generated task content
- [ ] All existing tests pass

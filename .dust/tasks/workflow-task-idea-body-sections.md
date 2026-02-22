# Workflow task idea body sections

Add explicit body sections to workflow tasks that link to the ideas they operate on. This makes the relationship navigable from the task body rather than requiring title-based filename derivation.

## Overview

Workflow tasks (Refine, Decompose, Shelve) will include a section that explicitly declares which idea they operate on:

- `## Refines Idea` — for refine tasks
- `## Decomposes Idea` — for decompose tasks
- `## Shelves Idea` — for shelve tasks

Each section contains a markdown link to the idea file, following the same pattern used for `## Principles` and `## Blocked By`. The title prefix convention is retained for human readability, but the body section becomes the primary source of truth for code.

## Implementation

1. Update `renderTask` in `lib/artifacts/workflow-tasks.ts` to accept an optional idea link section
2. Update `createRefineIdeaTask`, `decomposeIdea`, and `createShelveIdeaTask` to pass the appropriate section heading and idea link
3. Update `findWorkflowTaskForIdea` to search for body section links as the primary lookup mechanism (fall back to title-based matching for backwards compatibility)
4. Export `extractLinksFromSection` from `lib/artifacts/tasks.ts` so it can be reused
5. Add tests for the new behavior

## Principles

- [Clarity Over Brevity](../principles/clarity-over-brevity.md)
- [Small Units](../principles/small-units.md)

## Blocked By

(none)

## Definition of Done

- [ ] `createRefineIdeaTask` generates a `## Refines Idea` section with a link to the idea
- [ ] `decomposeIdea` generates a `## Decomposes Idea` section with a link to the idea
- [ ] `createShelveIdeaTask` generates a `## Shelves Idea` section with a link to the idea
- [ ] `findWorkflowTaskForIdea` uses body section links as primary lookup, with title-based fallback
- [ ] Tests verify the new section generation and lookup behavior
- [ ] `workflow-tasks.md` fact is updated to document the new body section pattern

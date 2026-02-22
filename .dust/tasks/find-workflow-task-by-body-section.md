# Find workflow task by body section

Update `findWorkflowTaskForIdea` to locate workflow tasks by scanning task files for body sections that link to the target idea. The operation-specific sections are `## Refines Idea`, `## Decomposes Idea`, and `## Shelves Idea`.

The current implementation derives expected task filenames from the idea title and checks for file existence. The new implementation should:

1. List all task files in `.dust/tasks/`
2. Parse each file for one of the known operation headings
3. Extract the link target from the section
4. Match if the link points to the target idea file

The body section is the source of truth. If a task has a matching title prefix but no body section, it is NOT associated with any idea. This intentionally breaks backward compatibility - tasks must include the body section.

The existing function signature remains unchanged:

```typescript
findWorkflowTaskForIdea(fileSystem, dustPath, ideaSlug): Promise<WorkflowTaskMatch | null>
```

Reuse the `extractLinksFromSection` pattern from `tasks.ts` for parsing.

## Principles

- [Clarity Over Brevity](../principles/clarity-over-brevity.md)

## Blocked By

- [Add body sections to workflow task creation](add-body-sections-to-workflow-task-creation.md)

## Definition of Done

- [ ] `findWorkflowTaskForIdea` locates tasks by parsing body sections
- [ ] Returns correct `WorkflowTaskType` based on section heading found
- [ ] Returns `null` for tasks without body section (even if title prefix matches)
- [ ] Works for refine, decompose, and shelve task types
- [ ] Unit tests cover matching by body section link
- [ ] All existing tests pass

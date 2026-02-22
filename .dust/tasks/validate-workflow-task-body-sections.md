# Validate workflow task body sections

Add linter validation for workflow task body sections. Tasks with title prefixes (Refine Idea, Decompose Idea, Shelve Idea) must include the corresponding body section with a valid link to an existing idea.

Validation rules:

- A task with `Refine Idea: ` prefix must have `## Refines Idea` section
- A task with `Decompose Idea: ` prefix must have `## Decomposes Idea` section
- A task with `Shelve Idea: ` prefix must have `## Shelves Idea` section
- The section must contain a markdown link to an existing idea file

Report actionable lint errors when:

- The expected section is missing
- The section exists but contains no valid link
- The link points to a non-existent idea file

## Principles

- [Clarity Over Brevity](../principles/clarity-over-brevity.md)
- [Actionable Errors](../principles/actionable-errors.md)

## Blocked By

- [Add body sections to workflow task creation](add-body-sections-to-workflow-task-creation.md)

## Definition of Done

- [ ] Linter validates presence of correct body section for each workflow task type
- [ ] Linter validates the section contains a link to an existing idea
- [ ] Error messages clearly describe what's wrong and how to fix it
- [ ] Unit tests cover all validation rules and error cases
- [ ] All existing tests pass

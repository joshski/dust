# Make principles optional in tasks

Remove the `## Principles` section as a required heading for task files, and remove it from workflow task templates.

Currently, every task file must contain a `## Principles` heading, even if it contains `(none)`. This adds visual noise without benefit for tasks where explicit principle alignment isn't valuable.

## Changes Required

1. **content-validator.ts**: Remove `## Principles` from `REQUIRED_HEADINGS`
2. **workflow-tasks.ts**: Remove `## Principles\n\n(none)` section from `renderTask()` and `createCaptureIdeaTask()`
3. **lint-markdown.test.ts**: Update tests that expect 3 required headings to expect 2
4. **task-file-format.md fact**: Update to show only 2 required headings (Blocked By, Definition of Done)

## Blocked By

(none)

## Definition of Done

- [ ] `## Principles` is removed from REQUIRED_HEADINGS in content-validator.ts
- [ ] `## Principles\n\n(none)` is removed from workflow task templates in workflow-tasks.ts
- [ ] Tests are updated and passing
- [ ] task-file-format.md fact reflects the new requirements
- [ ] `bin/dust check` passes

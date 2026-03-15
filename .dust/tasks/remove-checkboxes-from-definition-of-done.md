# Remove checkboxes from Definition of Done

Replace `- [ ]` checkbox syntax with plain `- ` list items in all Definition of Done sections. Checkboxes add visual noise without value — dust treats task completion as all-or-nothing (the whole task moves to `done/`), so per-item checkbox state is misleading.

## Changes

In `lib/artifacts/tasks.ts`:
- Update `extractDefinitionOfDone` to match plain list items (`- `) instead of checkbox items (`- [ ]` / `- [x]`). The function is a pure parser (functional core) — it takes markdown content and returns string arrays.

In `lib/artifacts/workflow-tasks.ts`:
- Change the template line `- [ ] ${item}` to `- ${item}` in `renderWorkflowTask`
- Change all hardcoded `- [ ]` items in `createDecomposeIdeaTask`, `createRefineIdeaTask`, and any other transition task functions to `- ` items

In `lib/audits/stock-audits.ts`:
- Replace all `- [ ]` prefixes with `- ` in every stock audit Definition of Done section

In `lib/cli/commands/new-task.ts`:
- Update the instruction text from `"using \`- [ ]\` for each item"` to `"using \`- \` for each item"` (or similar plain-list wording)

In tests:
- Update all test fixtures and assertions that use `- [ ]` in Definition of Done content to use `- ` instead

In `.dust/facts/task-file-format.md`:
- If it references checkbox format, update to describe plain list items

In existing `.dust/tasks/` files:
- Convert any `- [ ]` items to `- ` items

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md) — `extractDefinitionOfDone` is a pure parser in the functional core; updating it to match plain list items keeps the core side-effect free and easy to test
- [Comprehensive Test Coverage](../principles/comprehensive-test-coverage.md) — all affected templates and the parser must have their tests updated to verify the new format
- [Context Window Efficiency](../principles/context-window-efficiency.md) — removing checkbox noise makes task files more scannable for agents
- [Consistent Naming](../principles/consistent-naming.md) — all Definition of Done sections should use the same list format

## Blocked By

(none)

## Definition of Done

- `extractDefinitionOfDone` parses plain list items from Definition of Done sections
- Stock audit templates use plain `- ` list items instead of `- [ ]`
- Workflow task templates generate plain `- ` list items
- `new task` instructions reference plain list syntax
- All tests pass with the new format
- Existing task files in `.dust/tasks/` use plain list items

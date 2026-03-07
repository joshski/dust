# Move Workflow Task Hints Lower

Move interpolated workflow task hints out of opening instruction paragraphs.

Render them in a dedicated `## Repository Hints` section lower in each workflow task template.

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Unsurprising UX](../principles/unsurprising-ux.md)
- [Small Units](../principles/small-units.md)
- [Comprehensive Test Coverage](../principles/comprehensive-test-coverage.md)

## Relevant Facts

- [Workflow Task Hints](../facts/workflow-task-hints.md)
- [Workflow Task Capture](../facts/workflow-task-capture.md)
- [Workflow Task Transitions](../facts/workflow-task-transitions.md)
- [Task File Format](../facts/task-file-format.md)

## Blocked By

(none)

## Definition of Done

- [ ] Transition task templates (`refine-idea`, `decompose-idea`, `shelve-idea`) render hint content under `## Repository Hints` when a hint file exists
- [ ] Capture task templates (`add-idea`, `expedite-idea`) render hint content under `## Repository Hints` when a hint file exists
- [ ] `## Repository Hints` appears after the idea-specific section and before `## Definition of Done`
- [ ] Templates without hint files do not render an empty `## Repository Hints` section
- [ ] `lib/artifacts/workflow-tasks.test.ts` covers the new placement for all task types
- [ ] `bin/dust check` passes

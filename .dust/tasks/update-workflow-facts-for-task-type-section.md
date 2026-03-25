# Update workflow facts for Task Type section

Update facts documentation to reflect the new task type detection approach.

This updates documentation to reflect the completed changes.

## Background

Several facts document the current workflow task system:
- `.dust/facts/workflow-tasks.md`
- `.dust/facts/workflow-task-capture.md`
- `.dust/facts/workflow-task-transitions.md`

These need to be updated to reflect the new content-based task type detection.

## Implementation

1. Update `.dust/facts/workflow-tasks.md`:
   - Document the five task types: implement, capture, refine, decompose, shelve
   - Explain that task type is derived from `## Task Type` section
   - Note that title prefixes are optional convention

2. Update `.dust/facts/workflow-task-capture.md`:
   - Remove references to title prefix detection
   - Document that capture tasks have `## Task Type\n\ncapture`
   - Note that "expedite" concept is eliminated (both old capture-expedite and transition-expedite are now `implement`)

3. Update `.dust/facts/workflow-task-transitions.md`:
   - Remove references to section-based type detection being canonical
   - Document that all task types use `## Task Type` section
   - Update examples to show the new format

## Task Type

implement

## Principles

- [Traceable Decisions](../principles/traceable-decisions.md)
- [Atomic Commits](../principles/atomic-commits.md)

## Blocked By

- [Remove title-prefix-based validation](./remove-title-prefix-based-validation.md)

## Definition of Done

- All workflow facts reflect the new task type section approach
- Documentation accurately describes the five task types
- Examples show the `## Task Type` section
- `bin/dust check` passes

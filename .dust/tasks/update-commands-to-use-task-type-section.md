# Update commands to use Task Type section

Update CLI commands that reference task types to use the `## Task Type` section for type detection.

This updates the command layer to work with the new task type detection approach.

## Background

Commands like `dust focus` and `dust new task` reference task types in their output or logic. These need to be updated to use the new `## Task Type` section-based detection.

## Implementation

1. Update `lib/cli/commands/focus.ts`:
   - Replace `EXPEDITE_IDEA_PREFIX` checks with task type checks
   - Use task type to determine if task has an associated idea file (type !== 'implement' || old expedite transition types)

2. Update `lib/cli/commands/new-task.ts`:
   - Update documentation/instructions to mention the `## Task Type` section
   - Add the section to any task templates or examples

3. Check for other commands that may reference workflow task types:
   - Search codebase for uses of `EXPEDITE_IDEA_PREFIX`, `CAPTURE_IDEA_PREFIX`, `IDEA_TRANSITION_PREFIXES`
   - Update any remaining references to use task type section

Update tests for these commands to verify they work correctly with the new task type section.

## Task Type

implement

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Comprehensive Test Coverage](../principles/comprehensive-test-coverage.md)

## Blocked By

(none)

## Definition of Done

- `dust focus` uses task type section for type detection
- `dust new task` documents the `## Task Type` section
- No remaining references to old title-prefix-based detection
- Tests verify command behavior
- `bin/dust check` passes

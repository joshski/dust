# Semantic Link Validation

Extend `dust validate` to check that links in specific sections point to the correct artifact type.

Currently, validation checks that links point to existing files, but not that they're semantically correct. For example, a task's "Goals" section could link to another task file and pass validation.

## Proposed rules

- Links under `## Goals` must point to files in `.dust/goals/`
- Links under `## Blocked by` must point to files in `.dust/tasks/`

This catches mistakes where the wrong artifact type is referenced, improving the integrity of the planning structure.

# Add Task Type section to task file format

Update the task file format to require a mandatory `## Task Type` section and define the five allowed task types.

This is the first task in implementing content-based task type detection. It establishes the schema and validation rules without changing code that creates or reads tasks.

## Background

Currently, task types are detected using title prefixes (`Add Idea: `, `Expedite Idea: `, etc.) and section headings (`Refines Idea`, `Decomposes Idea`, etc.). This makes task type detection complex and brittle.

The new approach uses a single `## Task Type` section containing one of five values: `implement`, `capture`, `refine`, `decompose`, or `shelve`.

## Implementation

1. Update `.dust/facts/task-file-format.md`:
   - Add `## Task Type` to the required headings list
   - Document the five allowed values: `implement`, `capture`, `refine`, `decompose`, `shelve`
   - Explain that task type is mandatory for all tasks

2. Add validation in `lib/lint/validators/task-validator.ts`:
   - Validate that `## Task Type` section exists
   - Validate that the section contains exactly one of the five allowed values
   - Add tests for the new validation rules

3. Update this task file and any other existing tasks to include the `## Task Type` section (for this task: `implement`)

## Task Type

implement

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Lint Everything](../principles/lint-everything.md)

## Blocked By

(none)

## Definition of Done

- `.dust/facts/task-file-format.md` documents the mandatory `## Task Type` section
- Task validator checks for `## Task Type` section and validates its value
- Tests verify the validation rules
- All existing tasks (including this one) include `## Task Type` section
- `bin/dust check` passes

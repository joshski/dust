# Semantic link validation

Extend `dust validate` to check that links in specific sections point to the correct artifact type.

## Goals

- [Repository Hygiene](../goals/repository-hygiene.md)
- [Make Changes with Confidence](../goals/make-changes-with-confidence.md)

## Blocked by

(none)

## Definition of done

- [ ] Links under `## Goals` must point to files in `.dust/goals/`
- [ ] Links under `## Blocked by` must point to files in `.dust/tasks/`
- [ ] Validation errors clearly indicate which link has the wrong type
- [ ] Existing validation behavior is preserved
- [ ] `bin/dust check` passes

# Generate a single fact on init

When running `dust init`, generate a single fact (instead of a default goal) called `use-dust-for-planning.md` that links to the GitHub repository.

## Current behavior

Currently `dust init` creates a default goal file at `.dust/goals/project-goal.md` with generic placeholder text.

## Proposed changes

1. Remove the default goal creation from `init.ts`
2. Create a fact file at `.dust/facts/use-dust-for-planning.md` instead
3. The fact should contain a link to https://github.com/joshski/dust

## Goals

- [Easy Adoption](../goals/easy-adoption.md)

## Blocked by

(none)

## Definition of done

- [ ] `dust init` no longer creates `.dust/goals/project-goal.md`
- [ ] `dust init` creates `.dust/facts/use-dust-for-planning.md`
- [ ] The fact file contains a link to the GitHub repository (https://github.com/joshski/dust)
- [ ] Tests updated to reflect new behavior
- [ ] `bin/dust check` passes

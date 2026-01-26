# Integrate Validate into Check

Make `dust check` automatically run `dust validate` before executing the user's hook.

Currently, users must manually add `./bin/dust validate` to their `.dust/hooks/check` script. However, validation checks Dust's own files (task structure, broken links in `.dust/`) — this is "meta" validation that every Dust user would want, not project-specific like tests or linting.

## Goals

- [Easy Adoption](../goals/easy-adoption.md)
- [Fast Feedback](../goals/fast-feedback.md)

## Blocked by

(none)

## Definition of done

- `dust check` runs `dust validate` automatically before the user's hook
- If validation fails, `dust check` exits without running the hook
- Update `.dust/hooks/check` in this repo to remove the now-redundant validate step
- Tests cover the new behavior

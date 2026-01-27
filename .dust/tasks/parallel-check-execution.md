# Execute built-in checks in parallel with project-configured checks

The `dust check` command should run built-in checks (like link validation) in parallel with project-configured checks from `settings.json`, rather than sequentially. Output from both types of checks should be buffered in the same way.

## Goals

- [Fast Feedback](../goals/fast-feedback.md)

## Blocked by

(none)

## Definition of done

- [ ] Built-in checks and project-configured checks execute concurrently
- [ ] Output from all checks (built-in and configured) is buffered consistently
- [ ] Results displayed in deterministic order after all checks complete
- [ ] Overall exit code reflects failure if any check fails

# Rework Check Hook as List of Checks

Add a `checks` array to `.dust/config/settings.json` that defines quality gate commands. All checks run in parallel with buffered output.

## Goals

- [Context Window Efficiency](../goals/context-window-efficiency.md) - Only failed output appears, keeping agent context clean
- [Fast Feedback](../goals/fast-feedback.md) - Parallel execution speeds up quality gates

## Blocked by

(none)

## Definition of done

- [ ] Add `checks` array to `.dust/config/settings.json` schema with `name` and `command` fields
- [ ] Modify `lib/cli/check.ts` to:
  - Read checks from settings.json when present
  - Fall back to `.dust/hooks/check` if no checks configured
  - Run all checks in parallel using `Promise.all`
- [ ] Implement output buffering:
  - Capture stdout/stderr from each command
  - Suppress output for passing checks
  - For failing checks, print `> {command}` then the captured output
- [ ] Display clean summary showing pass/fail status per check (e.g., `✓ lint`, `✗ tests`)
- [ ] Add tests in `lib/cli/check.test.ts` covering:
  - Parallel execution
  - Output buffering behavior
  - Failure output format with command shown
- [ ] Update this repository's `.dust/config/settings.json` with checks, removing the bash hook

## Implementation notes

Example settings.json:
```json
{
  "dustCommand": "bin/dust",
  "checks": [
    { "name": "lint", "command": "bunx biome check ." },
    { "name": "typecheck", "command": "bunx tsc --noEmit" },
    { "name": "tests", "command": "bun test" }
  ]
}
```

Example failure output:
```
✓ lint
✓ typecheck
✗ tests
> bun test
[captured test output here...]

2/3 checks passed
```

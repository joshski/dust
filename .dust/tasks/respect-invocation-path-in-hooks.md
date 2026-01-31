# Respect invocation path in git hooks

When `dust init` is run via a custom wrapper (e.g., `bin/dust init`), the generated git hooks and settings should use that same invocation path instead of auto-detecting a package manager command.

## Problem

During exploratory testing, we set up a project with a `bin/dust` wrapper:

```bash
cat > bin/dust << 'EOF'
#!/bin/bash
exec /path/to/real/dust "$@"
EOF
```

When running `bin/dust init`, the generated settings and git hooks used `bunx dust` (auto-detected from the environment) instead of `bin/dust`. This causes the pre-push hook to fail because `bunx dust` isn't available in the isolated test environment.

## Current behavior

1. `detectDustCommand()` in `lib/cli/settings.ts` checks for lockfiles (bun.lockb, pnpm-lock.yaml, etc.)
2. Falls back to `npx dust` or `bunx dust` based on environment variables
3. This detection ignores how dust was actually invoked

## Proposed solution

Detect the invocation path and use it when:
1. The command appears to be a local path (starts with `./`, `../`, or is an absolute path)
2. Or when a `bin/dust` wrapper exists in the project

The detection in `lib/cli/settings.ts:detectDustCommand()` could be enhanced to accept an optional `invokedAs` parameter that `dust init` passes through.

## Files involved

- `lib/cli/settings.ts` - `detectDustCommand()` function
- `lib/cli/commands/init.ts` - calls `detectDustCommand()`
- `lib/git/hooks.ts` - uses `settings.dustCommand` (already correct)

## Goals

- [Easy Adoption](../goals/easy-adoption.md)
- [Agent autonomy](../goals/agent-autonomy.md)

## Blocked by

(none)

## Definition of done

- [ ] When `bin/dust init` is run, settings.json contains `"dustCommand": "bin/dust"`
- [ ] Git hooks use `bin/dust` instead of the auto-detected package manager command
- [ ] Existing behavior preserved when dust is run via `npx dust`, `bunx dust`, etc.
- [ ] Tests cover the new detection logic

# Add dust git hooks

When an agent runs the `dust agent` command, automatically manage git hooks to simplify the workflow and ensure consistency.

## Behavior

### Hook installation

When `dust agent` runs:

1. Check if git is available (skip hook management if not)
2. Check if a dust pre-commit hook is already installed in `.git/hooks/pre-commit`
3. If not installed:
   - Create the hook file (or append to existing hook to avoid clobbering)
   - The hook should run `dust pre commit` with the appropriate binary path
   - Store in configuration that hooks are installed
4. If installed:
   - Verify the binary path matches current config settings
   - Update if necessary

### The `dust pre commit` command

Create a new command that:
- Runs `dust check` internally
- Can be extended later with additional pre-commit specific linting
- Returns appropriate exit codes for git to accept/reject the commit

### Template simplification

When hooks are installed:
- Agent instructions can omit manual `dust check` reminders (the hook handles it)
- Track this state in config for template rendering decisions

## Non-clobbering hook installation

If `.git/hooks/pre-commit` already exists:
- Append the dust hook call rather than replacing the file
- Use a marker comment to identify the dust-added section
- Allow removal/update of just the dust section

## Goals

- [Easy Adoption](../goals/easy-adoption.md)
- [Agent Autonomy](../goals/agent-autonomy.md)
- [Repository Hygiene](../goals/repository-hygiene.md)

## Blocked by

(none)

## Definition of done

- [ ] `dust agent` detects whether git hooks are installed
- [ ] Hook installs automatically if git is present and hook not installed
- [ ] Existing hooks are preserved (dust section appended, not replaced)
- [ ] `dust pre commit` command exists and runs `dust check`
- [ ] Hook uses correct binary path from config
- [ ] `dust agent` verifies and updates hook binary path if needed
- [ ] Hook installation status is tracked for template rendering
- [ ] Agent instructions simplified when hooks are active

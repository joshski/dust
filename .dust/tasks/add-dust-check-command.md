# Add dust check Command

Add a `dust check` command that executes a project-defined quality gate hook.

## Goals

- [Make Changes with Confidence](../goals/make-changes-with-confidence.md)
- [Fast Feedback](../goals/fast-feedback.md)
- [Agent Agnostic](../goals/agent-agnostic.md)

## Blocked by

(none)

## Definition of done

- `dust check` command exists
- Command looks for `.dust/hooks/check` (executable)
- If found, executes it and forwards the exit code
- If not found, exits with error and helpful message explaining how to create the hook
- `.dust/hooks/check` exists in this repository, running:
  - `bun test` (unit tests)
  - `bun run lint:tasks` (task linting)
  - `bun run validate:links` (link validation)
  - TypeScript type checking
- Hook is executable (`chmod +x`)

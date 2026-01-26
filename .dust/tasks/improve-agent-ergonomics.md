# Improve agent ergonomics

Simplify how projects communicate dust workflows to AI agents.

## Background

Currently, `claude.md` contains detailed instructions about the `.dust/` directory structure, task workflows, and quick commands. This approach has problems:

1. **Bootstrap problem** - How do new projects get these instructions initially?
2. **Staleness** - As dust evolves, project-level instructions become outdated
3. **Verbosity** - Long agent files pollute project roots with dust-specific details

## Solution

Replace verbose agent instructions with a minimal pointer to dust's built-in help:

```markdown
This project uses [dust](https://github.com/joshski/dust) for planning and documentation - run `dust help` to get started.
```

For the dust repository itself, use `bin/dust` since that's the local development entry point.

This approach:
- Keeps agent instructions minimal and stable
- Ensures agents always get current documentation from dust itself
- Reduces maintenance burden on projects using dust

## Goals

- [Fast Feedback](../goals/fast-feedback.md)

## Blocked by

(none)

## Definition of done

- `dust help` command exists and provides comprehensive guidance for agents
- CLAUDE.md and AGENTS.md in the dust repo point to `bin/dust help`
- Documentation explains how other projects should configure their agent files

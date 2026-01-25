# Current Architecture

Dust has a specification and minimal tooling.

## Implemented

- Specification documented in [README.md](../../README.md)
- Directory structure for planning artifacts
- Task linter for validating task file structure (`scripts/lint-tasks.ts`)
- Unit tests for task linter (`lib/task-linter.test.ts`)

## Not Yet Implemented

- Link validator for checking relative links
- Git integration for branch-based task claiming
- CLI for managing Dust files
- History traversal tools

## Directory Structure

```
.dust/
├── goals/    # Mission statements
├── ideas/    # Future feature notes
├── tasks/    # Detailed work plans
└── facts/    # Current state documentation
```

Each directory is flat (no subdirectories) and contains only markdown files with slug-style names.

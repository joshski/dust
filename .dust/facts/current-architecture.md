# Current Architecture

Dust is currently specification-only. No tooling has been implemented.

## Implemented

- Specification documented in [README.md](../../README.md)
- Directory structure for planning artifacts

## Not Yet Implemented

- Task linter for validating task file structure
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

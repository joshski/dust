# Dust Directory Structure

The `.dust/` directory contains planning artifacts organized by type:

```
.dust/
├── goals/    # Mission statements and principles
├── ideas/    # Future feature notes and proposals
├── tasks/    # Detailed work plans with dependencies
├── facts/    # Current state documentation
└── hooks/    # Executable scripts (e.g., check for quality gates)
```

The goals, ideas, tasks, and facts directories are flat (no subdirectories) and contain only markdown files with slug-style names.

The hooks directory contains executable scripts that integrate with the `dust` CLI. The `check` hook is run by `dust check` to execute project-defined quality gates.

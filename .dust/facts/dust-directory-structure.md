# Dust Directory Structure

The `.dust/` directory contains planning artifacts organized by type.

```
.dust/
├── goals/    # Mission statements and principles
├── ideas/    # Future feature notes and proposals
├── tasks/    # Detailed work plans with dependencies
├── facts/    # Current state documentation
└── config/   # Configuration files (settings.json)
```

The goals, ideas, tasks, and facts directories are flat (no subdirectories) and contain only markdown files with slug-style names.

The config directory contains `settings.json` which configures the `dust` CLI. See [Configuration System](./configuration-system.md) for details.

# Dust Directory Structure

The `.dust/` directory contains planning artifacts organized by type.

```
.dust/
├── principles/    # Guiding principles
├── ideas/    # Future feature notes and proposals
├── tasks/    # Detailed work plans with dependencies
├── facts/    # Current state documentation
└── config/   # Configuration files and known subdirectories
```

The principles, ideas, tasks, and facts directories are flat (no subdirectories) and contain only markdown files with slug-style names.

The config directory uses a strict allowlist. Supported entries are:

- `settings.json`
- `audits/`
- `hints/`
- `agents/`

Unknown files or subdirectories in `.dust/config/` are lint violations. See [Configuration System](./configuration-system.md) for details.

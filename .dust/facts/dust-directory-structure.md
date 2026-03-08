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

The `.dust/` root uses a strict allowlist. Supported root paths are:

- `principles/`
- `ideas/`
- `tasks/`
- `facts/`
- `config/`
- `repository.md`

Unknown files or subdirectories directly under `.dust/` are lint violations.
`extraDirectories` in `.dust/config/settings.json` is deprecated and does not extend this allowlist.

The config directory uses a strict allowlist. Supported entries are:

- `settings.json`
- `audits/`
- `hints/`
- `agents/`

Unknown files or subdirectories in `.dust/config/` are lint violations. See [Configuration System](./configuration-system.md) for details.

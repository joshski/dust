# Improve README formatting

The README's Structure section (lines 11-17) uses paragraph form to describe the `.dust/` directories. This isn't easy to scan at a glance.

Consider using a visual tree format like the one in [Dust Directory Structure](../facts/dust-directory-structure.md):

```
.dust/
├── goals/    # Mission statements and principles
├── ideas/    # Future feature notes and proposals
├── tasks/    # Detailed work plans with dependencies
├── facts/    # Current state documentation
└── hooks/    # Executable scripts for quality gates
```

This would make the directory structure immediately visible.

Additionally, the README should document the hooks directory, which is currently missing. The hooks directory contains executable scripts that integrate with the `dust` CLI - for example, the `check` hook runs project-defined quality gates via `dust check`.

# Audit Quality Audit

Add a stock audit that reviews custom audit files for semantic quality concerns that can't be checked statically.

## Context

Custom audits in `.dust/config/audits/` can be validated structurally by `dust lint` (required sections, opening sentences), but some concerns require judgment or filesystem exploration:

1. **Output guidance** - Audit templates should guide agents to create ideas, not tasks. The `ideasHint` pattern used by stock audits establishes this convention.
2. **Stale references** - File or directory paths mentioned in audit templates may no longer exist.
3. **Override rationale** - Custom audits that override stock audits should have documented reasons for the customization.

## Proposed Solution

Create an `audit-quality` stock audit that examines files in `.dust/config/audits/` for:

- Templates that guide agents to create tasks instead of ideas
- Literal file path references to non-existent files (glob patterns can be skipped)
- Overrides of stock audits lacking clear customization rationale

This complements structural validation in `dust lint` by catching semantic issues that require context or judgment.

## Context Note

This idea emerged from decomposing the original "Lint Custom Audits" idea, which split structural validation (now implemented in `dust lint`) from semantic validation (this idea).

# Deprecate extra directories for .dust lint allowlisting

Stop treating `extraDirectories` in `.dust/config/settings.json` as lint allowlisting for arbitrary `.dust/` paths.
Document the deprecation behavior.

## Principles

- [Repository Hygiene](../principles/repository-hygiene.md)
- [Lint Everything](../principles/lint-everything.md)
- [Traceable Decisions](../principles/traceable-decisions.md)

## Relevant Facts

- [Configuration System](../facts/configuration-system.md)
- [Dust Directory Structure](../facts/dust-directory-structure.md)

## Blocked By

- [Implement strict .dust root allowlist validation](./implement-strict-dust-root-allowlist-validation.md)

## Definition of Done

- [ ] Built-in lint ignores `extraDirectories` when validating `.dust/` path allowlisting.
- [ ] Settings validation and/or command guidance makes the deprecation explicit so users can migrate without ambiguity.
- [ ] Facts and tests are updated to reflect that `extraDirectories` no longer controls lint allowlisting.

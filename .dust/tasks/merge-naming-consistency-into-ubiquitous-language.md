# Merge naming-consistency into ubiquitous-language

Add factory/constructor naming analysis to `ubiquitous-language` and remove the separate `naming-consistency` audit.

## Context

Both audits address naming/terminology consistency:

- `naming-consistency` focuses narrowly on factory/constructor naming (build*/create*/make*/new*)
- `ubiquitous-language` covers broader terminology drift across code, docs, and UI

The factory naming check is a specific case of terminology consistency. Adding it as a subsection of `ubiquitous-language` keeps all naming concerns in one place.

## Changes

1. Add a "Factory/Constructor Naming" section to `ubiquitousLanguage` covering the build*/create*/make*/new* analysis from `namingConsistency`
2. Delete the `namingConsistency` function
3. Remove `'naming-consistency'` from `stockAuditFunctions`

## Principles

- [Consistent Naming](../principles/consistent-naming.md) — Factory naming patterns should follow repository conventions
- [Naming Matters](../principles/naming-matters.md) — Good naming reduces cognitive load

## Blocked By

(none)

## Definition of Done

- [ ] `ubiquitousLanguage` includes factory/constructor naming analysis
- [ ] `namingConsistency` function is deleted
- [ ] `'naming-consistency'` removed from `stockAuditFunctions`
- [ ] `bin/dust check` passes

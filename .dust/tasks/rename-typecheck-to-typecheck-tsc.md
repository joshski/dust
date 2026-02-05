# Rename Typecheck to Typecheck (tsc)

The check named `typecheck` in `.dust/config/settings.json` is inconsistent with other check names. Other checks include the tool name in parentheses: `lint (biome)`, `tests (vitest)`, `tests (bun)`.

Rename the `typecheck` check to `typecheck (tsc)` to match this convention.

## Changes

- In `.dust/config/settings.json`, change `"name": "typecheck"` to `"name": "typecheck (tsc)"`

## Goals

- [Consistent Naming](../goals/consistent-naming.md)

## Blocked By

(none)

## Definition of Done

- [ ] The check name in `.dust/config/settings.json` reads `typecheck (tsc)`
- [ ] `bin/dust check` still passes

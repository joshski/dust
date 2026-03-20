# Include Principles in npm Package

Add `.dust/principles/` to the npm package so downstream users can access dust's principles.

## Context

Dust's principles directory must be bundled with the npm package for the core principles feature to work. Downstream users will read principles from the installed package rather than making network requests.

## Scope

Add `.dust/principles` to the `files` array in `package.json`:

```json
{
  "files": [
    "dist",
    "bin",
    "lib/istanbul/minimal-reporter.cjs",
    "biome",
    ".dust/principles"
  ]
}
```

## Principles

- [Batteries Included](../principles/batteries-included.md)

## Blocked By

- [Mark Internal Principles](mark-internal-principles.md)

## Definition of Done

- `package.json` files array includes `.dust/principles`
- `npm pack` includes the principles directory
- Principles files are accessible from the installed package location

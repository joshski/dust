# Export Biome Rules in npm Package

Include the `biome/` directory in the npm package and add a programmatic export for the biome rules path. This enables downstream users to use dust's GritQL lint rules in their own projects.

## Background

Dust uses custom GritQL rules stored in the `biome/` directory. These rules enforce coding standards like avoiding abbreviated variable names. Downstream users should be able to reference these rules without copying files manually.

## Implementation

1. Add `biome` to the `files` array in `package.json`
2. Rename `biome/no-abbreviated-names.grit` to `biome/dust-no-abbreviated-names.grit` (namespaced naming)
3. Update `biome.json` to reference the renamed file
4. Add a `@joshski/dust/biome` export that provides the path to the biome directory
5. Update the [Package Exports](../facts/package-exports.md) fact to document the new export

Example downstream usage:

```json
{
  "plugins": ["./node_modules/@joshski/dust/biome/dust-no-abbreviated-names.grit"]
}
```

Or programmatically:

```typescript
import { biomePath } from "@joshski/dust/biome";
// Returns: "/path/to/node_modules/@joshski/dust/biome"
```

## Principles

- [Easy Adoption](../principles/easy-adoption.md)
- [Lint Everything](../principles/lint-everything.md)

## Blocked By

(none)

## Definition of Done

- [ ] `biome` directory is included in npm package files
- [ ] Rule file uses namespaced naming (`dust-no-abbreviated-names.grit`)
- [ ] `@joshski/dust/biome` export provides the biome directory path
- [ ] Package exports fact is updated to document the new export
- [ ] `bin/dust check` passes

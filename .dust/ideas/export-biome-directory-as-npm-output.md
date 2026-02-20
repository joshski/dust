# Export biome directory as npm output

Downstream users of dust should be able to use dust's biome gritql rules in their own projects without having to copy files manually.

## Background

Dust uses [Biome](https://biomejs.dev/) with custom GritQL rules stored in the `biome/` directory. Currently, the `no-abbreviated-names.grit` rule enforces full variable names instead of abbreviations like `ctx`, `opts`, `err` (see [Biome Custom Rules](../facts/biome-custom-rules.md)).

The `@joshski/dust` package already exports several modules (see [Package Exports](../facts/package-exports.md)):
- `@joshski/dust/types` - Type definitions
- `@joshski/dust/logging` - Debug logging
- `@joshski/dust/agents` - Agent detection
- `@joshski/dust/artifacts` - Repository interface
- `@joshski/dust/istanbul/minimal-reporter` - Coverage reporter

However, the `biome/` directory is not included in the npm package. The `files` field in `package.json` only includes `dist`, `bin`, and `lib/istanbul/minimal-reporter.cjs`.

## Proposed Solution

Include the `biome/` directory in the npm package output so downstream users can reference dust's GritQL rules in their own `biome.json` configuration.

Example usage in a downstream project:

```json
{
  "plugins": ["./node_modules/@joshski/dust/biome/no-abbreviated-names.grit"]
}
```

## Implementation

Add `biome` to the `files` array in `package.json`:

```json
{
  "files": [
    "dist",
    "bin",
    "lib/istanbul/minimal-reporter.cjs",
    "biome"
  ]
}
```

## Principle Alignment

- [Easy Adoption](../principles/easy-adoption.md) - Allows projects to reuse dust's lint rules without copy-pasting
- [Lint Everything](../principles/lint-everything.md) - Extends dust's linting philosophy to downstream consumers

## Open Questions

### Should this include a helper utility for finding the rules path?

#### Export path utilities

Add a programmatic export that provides the path to the biome directory:

```typescript
import { biomePath } from "@joshski/dust/biome";
// Returns: "/path/to/node_modules/@joshski/dust/biome"
```

This would help downstream users who want to dynamically resolve paths rather than hardcoding `node_modules` paths.

#### Static files only

Just include the files in the package. Users reference them with relative paths like `./node_modules/@joshski/dust/biome/no-abbreviated-names.grit`. Simpler to implement and follows how most config-file-based tools work.

### Should downstream users be able to import individual rules or the whole directory?

#### Export all rules as a directory

Include the entire `biome/` directory. Users pick which rules they want by referencing individual `.grit` files. Simple and flexible.

#### Export a rules manifest

Provide a JSON manifest listing all available rules with descriptions. Users can discover rules without browsing node_modules.

#### Both

Include both the directory and a manifest file like `biome/rules.json`. Adds slight complexity but improves discoverability.

### How should rule naming conventions work?

#### Current naming

Keep current filename-based naming (`no-abbreviated-names.grit`). Users reference full paths.

#### Namespaced naming

Rename rules to include a prefix (e.g., `dust-no-abbreviated-names.grit`) to avoid collisions with user rules.

#### No change needed

Biome plugins are referenced by path, so naming collisions are unlikely. Keep simple naming.

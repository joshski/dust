# Add knip Check

Integrate [knip](https://github.com/webpro-nl/knip) into `bin/dust check` to detect unused files, dependencies, and exports.

## Context

Knip already runs successfully via `bunx knip` and identifies unused code. This task adds knip as a blocking check (strict mode) to prevent dead code accumulation.

## Changes Required

### 1. Create `knip.json` configuration

Configure entry points based on [Package Exports](../facts/package-exports.md):

```json
{
  "entry": [
    "bin/dust.ts",
    "lib/types.ts",
    "lib/logging/index.ts",
    "lib/agents/index.ts",
    "lib/artifacts/index.ts",
    "lib/istanbul/minimal-reporter.cjs"
  ],
  "ignoreDependencies": ["@biomejs/biome"]
}
```

The `@biomejs/biome` dependency is invoked via `bunx biome` in settings.json, not imported directly.

### 2. Add explicit devDependencies

Add `istanbul-lib-report` and `istanbul-lib-coverage` to devDependencies. These are imported in test files but come as transitive dependencies of `@vitest/coverage-v8`.

### 3. Clean up unused code

After configuration, remove any remaining unused exports that knip flags:
- Remove unused files (e.g., `lib/cli/run.ts` if unused)
- Remove unused exports from internal modules (not public API)

### 4. Add check to settings.json

```json
{
  "name": "unused code (knip)",
  "command": "bunx knip",
  "hints": [
    "Run `bunx knip` to see full details",
    "Add intentional exports to knip.json entry configuration"
  ]
}
```

## Principles

- [Lint Everything](../principles/lint-everything.md)
- [Repository Hygiene](../principles/repository-hygiene.md)

## Blocked By

(none)

## Definition of Done

- [ ] `knip.json` exists with entry points and ignoreDependencies configured
- [ ] `istanbul-lib-report` and `istanbul-lib-coverage` are in devDependencies
- [ ] Unused code is cleaned up so knip passes
- [ ] `bin/dust check` includes knip and passes

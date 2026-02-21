# Integrate knip

Integrate [knip](https://github.com/webpro-nl/knip) into the dust check workflow to detect unused files, dependencies, and exports.

## Current Status

Knip already runs successfully on this codebase via `bunx knip`. Current findings:

| Category | Count |
|----------|-------|
| Unused files | 3 |
| Unused dependencies | 1 |
| Unused devDependencies | 1 |
| Unlisted dependencies | 3 |
| Unused exports | 14 |
| Unused exported types | 47 |

Many of these findings represent genuine dead code that could be cleaned up. Some may be false positives due to dynamic usage patterns or external consumers (e.g., exports intended for package consumers).

## Integration Approach

Add knip as a check in `.dust/config/settings.json`:

```json
{
  "name": "unused code (knip)",
  "command": "bunx knip",
  "hints": [
    "Run `bunx knip` to see full details",
    "Add intentional exports to knip.json config"
  ]
}
```

This aligns with the [Lint Everything](../principles/lint-everything.md) principle: catching unused code statically prevents dead code accumulation.

## Configuration Needs

Knip may require a `knip.json` configuration file to:
- Ignore intentional re-exports in `lib/artifacts/index.ts` meant for external consumers
- Configure entry points for the CLI binary
- Handle the self-referencing `@joshski/dust` dependency pattern

## False Positives to Address

Before knip can pass as a check, these false positives need configuration:

1. **`@biomejs/biome` devDependency** - Invoked via `bunx biome` in scripts, not imported
2. **`@joshski/dust` dependency** - Self-reference that exists in package.json (see [Remove Unused Self-Reference Dependency](../tasks/remove-unused-self-reference-dependency.md))
3. **Istanbul packages as unlisted** - `istanbul-lib-report` and `istanbul-lib-coverage` are transitive dependencies of `@vitest/coverage-v8`

## Related Ideas and Principles

- [Remove Unused Self-Reference Dependency](../tasks/remove-unused-self-reference-dependency.md) - Identified by knip
- [Remove Unused Test Utilities Exports](remove-unused-test-utilities-exports.md) - Identified by knip
- [Unexport Internal Validation Functions](unexport-internal-validation-functions.md) - Identified by knip
- [Integrate FTA](integrate-fta.md) - Complementary complexity analysis tool
- [Repository Hygiene](../principles/repository-hygiene.md) - Keeping the codebase clean
- [Lint Everything](../principles/lint-everything.md) - Static analysis for all code aspects

## Open Questions

### Should knip block builds or just warn?

#### Option: Block builds (strict mode)

Treat knip violations like lint errors: fail the check and require fixes before merging. This ensures dead code never accumulates.

#### Option: Warn only (advisory mode)

Run knip as a separate advisory check (not part of `dust check`). Developers review output manually but builds don't fail. Reduces friction but allows dead code to accumulate.

### How should intentional public API exports be handled?

#### Use knip's entry configuration

Configure entry points in `knip.json` to specify which files are public API. Knip will trace from these entries and recognize their exports as used. This works well with the package.json exports structure documented in [Package Exports](../facts/package-exports.md).

#### Use @public JSDoc annotations

Mark intentional exports with JSDoc annotations that knip recognizes, keeping the configuration minimal. Requires modifying source files.

#### Maintain an explicit ignore list

Add unused exports to a knip ignore configuration. More maintenance burden but explicit documentation of intentional exports.

### How should CLI-only tool usage be handled?

#### Add to ignoreDependencies

Configure `ignoreDependencies: ["@biomejs/biome"]` in knip.json. Simple and explicit. Knip cannot detect that biome is invoked via `bunx biome` in scripts rather than imported.

#### Use knip's script parsing

Knip can parse package.json scripts to detect binary usage. Move the biome invocation from settings.json to package.json scripts. May require restructuring how checks are configured.

### Should unlisted transitive dependencies be declared or ignored?

#### Add as explicit devDependencies

Declare `istanbul-lib-report` and `istanbul-lib-coverage` in devDependencies. The istanbul packages are imported in test files but come as transitive dependencies of `@vitest/coverage-v8`. Explicit declaration protects against transitive dependency changes.

#### Ignore in knip configuration

Add to `ignoreUnresolved` or `ignoreDependencies`. Simpler but relies on transitive dependency stability.

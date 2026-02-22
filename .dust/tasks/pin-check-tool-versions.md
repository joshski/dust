# Pin check tool versions

Add `knip` and `typescript` to `devDependencies` and update check commands to use the locally-installed versions instead of `bunx`.

## Current Behavior

Several checks in `.dust/config/settings.json` use `bunx` to run tools without pinning a version:
- `bunx knip` - unused code detection
- `bunx tsc` - type checking

This means different developers may get different versions, leading to inconsistent check results.

Note: `@biomejs/biome` is already in `devDependencies` but the check command still uses `bunx biome check .` instead of the local binary.

## Implementation

1. Add `knip` and `typescript` to `devDependencies` in `package.json`
2. Run `bun install` to update the lockfile
3. Update check commands in `.dust/config/settings.json`:
   - Change `bunx knip` to `bun run knip`
   - Change `bunx biome check .` to `bun run biome check .`
   - Change `bunx tsc -p tsconfig.json --noEmit` to `bun run tsc -p tsconfig.json --noEmit`
4. Update hint text to match new commands
5. Verify all checks still pass with `bin/dust check`

## Principles

- [Reproducible Checks](../principles/reproducible-checks.md) - Pinning versions ensures identical results across environments
- [Make Changes with Confidence](../principles/make-changes-with-confidence.md) - Developers can trust that checks behave consistently

## Blocked By

(none)

## Definition of Done

- [ ] `knip` and `typescript` added to `devDependencies`
- [ ] Check commands updated to use `bun run` instead of `bunx`
- [ ] Hint text updated to match new commands
- [ ] `bin/dust check` passes (excluding pre-existing test failures)

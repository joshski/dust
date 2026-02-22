# Pin check tool versions

Add tools used by `dust check` (like `knip` and `biome`) as pinned `devDependencies` so that all developers and CI environments use the same version.

## Background

Currently, several checks in `settings.json` use `bunx` to run tools like `knip` and `biome` without pinning a version. This means different developers may get different versions, leading to inconsistent check results. One developer's clean run could be another's failure, undermining trust in the checks.

## Proposed Solution

1. Add `knip` and `biome` to `devDependencies` in `package.json`
2. Update check commands in `.dust/config/settings.json` to use `bun run` or reference the locally-installed binary instead of `bunx`

## Principle Alignment

- [Reproducible Checks](../principles/reproducible-checks.md) - Pinning versions ensures identical results across environments
- [Make Changes with Confidence](../principles/make-changes-with-confidence.md) - Developers can trust that checks behave consistently

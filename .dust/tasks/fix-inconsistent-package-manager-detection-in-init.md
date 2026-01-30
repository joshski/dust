# Fix inconsistent package manager detection in init

The `generateSettings()` function in `lib/cli/commands/init.ts` uses different detection logic than `detectDustCommand()` in `lib/cli/settings.ts`, causing inconsistent settings files when initializing in certain project configurations.

## Problem

When running `dust init` in a fresh bun project that has `package.json` but no `bun.lockb` yet:

- `detectDustCommand()` detects bun via `BUN_INSTALL` env var → returns `bunx dust`
- Inline detection in `generateSettings()` has no env var fallback → falls back to npm

This produces an inconsistent settings file:

```json
{
  "dustCommand": "bunx dust",
  "checks": [{ "name": "test", "command": "npm test" }],
  "installDependenciesHint": "Run `npm install`"
}
```

## Additional issue

`detectInstallDependenciesHint()` in `settings.ts` checks for both `bun.lockb` and `bun.lock`, but `generateSettings()` only checks for `bun.lockb`.

## Solution

Refactor `generateSettings()` to use the existing detection functions from `settings.ts` instead of duplicating detection logic:

- Use `detectDustCommand()` (already does this)
- Use `detectInstallDependenciesHint()` instead of inline detection
- For checks, either create a new `detectTestCommand()` function or ensure the inline logic matches `detectDustCommand()` fallbacks

## Relevant files

- `lib/cli/commands/init.ts` - contains `generateSettings()` with inline detection
- `lib/cli/settings.ts` - contains `detectDustCommand()` and `detectInstallDependenciesHint()`

## Goals

- [Easy Adoption](../goals/easy-adoption.md)

## Blocked by

(none)

## Definition of done

- [ ] `generateSettings()` produces consistent package manager settings (all npm, all bun, etc.)
- [ ] Detection logic includes `BUN_INSTALL` env var fallback for checks
- [ ] Detection logic checks for both `bun.lockb` and `bun.lock`
- [ ] Tests cover the env var fallback scenario
- [ ] `bin/dust check` passes

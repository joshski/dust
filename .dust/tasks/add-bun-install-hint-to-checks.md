# Add bun install hint to vitest and lint checks

The `lint` and `tests (vitest)` checks in `.dust/config/settings.json` should include a hint to run `bun install` when dependencies might be missing.

Currently, only the `build` check has this hint. The lint check uses `bunx biome` which requires biome to be installed, and the vitest tests require test dependencies. Adding this hint will help users who encounter failures on a fresh checkout.

## Goals

(none)

## Blocked by

(none)

## Definition of done

- [ ] Add "Run `bun install` if this is a fresh checkout" hint to the `lint` check in `.dust/config/settings.json`
- [ ] Add "Run `bun install` if this is a fresh checkout" hint to the `tests (vitest)` check in `.dust/config/settings.json`
- [ ] Run `bin/dust validate` to ensure the changes are valid

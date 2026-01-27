# Improve package runner detection

Rename `binaryPath` to `dustCommand` and auto-detect it when not explicitly configured.

## Problem

Currently the detection checks `process.versions.bun` first, but this doesn't work when running via `bunx` because the built JavaScript targets Node. Users running `bunx dust init` get incorrect commands in the generated files.

## Proposed changes

1. Rename `binaryPath` to `dustCommand` in settings
2. Auto-detect `dustCommand` when not set, using this order:
   - `bun.lockb` exists → `bunx dust`
   - `pnpm-lock.yaml` exists → `pnpx dust`
   - `package-lock.json` exists → `npx dust`
   - No lockfile + `BUN_INSTALL` env var set → `bunx dust`
   - Default → `npx dust`
3. Update templates to use `{{dustCommand}}` (or keep `{{bin}}` as shorthand)

## Goals

- [Easy Adoption](../goals/easy-adoption.md)

## Blocked by

(none)

## Definition of done

- [ ] `binaryPath` renamed to `dustCommand` in settings interface and this repo's settings.json
- [ ] Auto-detection uses lockfiles before environment
- [ ] `package-lock.json` results in `npx dust`
- [ ] No lockfile + `BUN_INSTALL` set results in `bunx dust`
- [ ] CLAUDE.md/AGENTS.md templates use detected `dustCommand`
- [ ] Tests cover all detection scenarios
- [ ] `bin/dust check` passes

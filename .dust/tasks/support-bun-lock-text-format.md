# Support bun.lock Text Format

Add support for bun's text-based `bun.lock` lockfile format alongside the binary `bun.lockb` format.

Bun 1.0 introduced `bun.lock` as the new default lockfile format. Currently, `detectTestCommand()` correctly handles both formats, but `detectDustCommand()` and `LOCKFILE_COMMANDS` only check for `bun.lockb`.

## Implementation

In `lib/config/settings.ts`:

1. Update `detectDustCommand()` to check for `bun.lock` (prioritizing it over `bun.lockb` as the newer format)
2. Add `bun.lock` to `LOCKFILE_COMMANDS` array (before `bun.lockb` to prioritize the newer format)
3. Update `.dust/facts/configuration-system.md` to document both formats

Follow the existing pattern in `detectTestCommand()` (lines 310-311) which already checks both lockfile formats.

## Blocked By

(none)

## Definition of Done

- [ ] `detectDustCommand()` returns `bunx dust` when `bun.lock` exists
- [ ] `detectInstallCommand()` returns `bun install` when `bun.lock` exists
- [ ] `bun.lock` is prioritized over `bun.lockb` (newer format takes precedence)
- [ ] Tests cover both `bun.lock` and `bun.lockb` detection
- [ ] `.dust/facts/configuration-system.md` documents both formats

## Principles

- [Easy Adoption](../principles/easy-adoption.md)
- [Broken Windows](../principles/broken-windows.md)

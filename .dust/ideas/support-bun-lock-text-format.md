# Support bun.lock Text Format

Bun 1.0 introduced `bun.lock` as the new default lockfile format, a text-based JSONC file that replaced the binary `bun.lockb`. Currently, dust only detects `bun.lockb` in two places, while `detectTestCommand` correctly handles both formats.

## Context

In `lib/config/settings.ts`:

1. **`detectDustCommand()`** (line 216) only checks for `bun.lockb`
2. **`LOCKFILE_COMMANDS`** (line 238) only includes `bun.lockb` for install detection
3. **`detectTestCommand()`** (lines 310-311) correctly checks both `bun.lockb` and `bun.lock`

The documentation in `.dust/facts/configuration-system.md` also only mentions `bun.lockb`.

## Implementation

Add `bun.lock` detection alongside `bun.lockb` in:

1. `detectDustCommand()` - check for both files
2. `LOCKFILE_COMMANDS` array - add `bun.lock` entry (should be first to prioritize newer format)
3. Update `.dust/facts/configuration-system.md` to document both formats

The existing tests for `bun.lock` in `detectTestCommand` provide a pattern to follow.

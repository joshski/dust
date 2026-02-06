# Consolidate process runner patterns

Three commands implement nearly identical process-spawning patterns.

They each spawn child processes, buffer output, and resolve with exit codes:

- `lib/cli/commands/check.ts` - `createBufferedRunner()`
- `lib/cli/commands/pre-push.ts` - `createGitRunner()`
- `lib/claude/spawn-claude-code.ts` - `spawnClaudeCode()` factory

A shared `lib/process/buffered-runner.ts` could provide the common pattern, with each call site only specifying what differs.

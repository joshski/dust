# Replace "go" prompt with runtime-detected entry command in loop

Use a runtime-detected entry command instead of the hardcoded `"go"` prompt so the agent loop installs dependencies, loads agent instructions, and discovers tasks — even if CLAUDE.md is damaged.

The entry command should be something like:
```
bun install && bunx dust agent && bunx dust next
```
The exact commands are detected based on the JS runtime (bun/pnpm/npm).

## Goals

- Resilient agent loop that works even if CLAUDE.md is damaged
- Dependencies are installed after each git pull
- Agent instructions are loaded via `dust agent`
- Available tasks are discovered via `dust next`

## Blocked By

(none)

## Definition of Done

- [x] In `lib/config/settings.ts`, `detectInstallCommand` detects the appropriate install command (bun install / pnpm install / npm install) based on lockfiles
- [x] `DustSettings` includes `installCommand` field, auto-detected like `dustCommand`
- [x] In `lib/cli/commands/loop.ts`, `runOneIteration` passes `"Run \`{installCommand} && {dustCommand} agent && {dustCommand} next\` and follow the instructions."` to `run()` instead of `"go"`
- [x] Existing tests updated to reflect the new prompt
- [x] `bun test` and `bun run check` pass

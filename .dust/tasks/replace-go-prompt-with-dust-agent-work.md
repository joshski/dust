# Replace "go" prompt with `dust agent work` in loop

## Goals

- Resilient agent loop that works even if CLAUDE.md is damaged

## Blocked by

(none)

## Definition of done

- [ ] In `lib/cli/commands/loop.ts`, `runOneIteration` passes `"Run \`{dustCommand} agent work\` and follow its instructions"` (or similar) to `run()` instead of `"go"`
- [ ] The `dustCommand` is read from settings (same as other commands use `settings.dustCommand`)
- [ ] `runOneIteration` receives the dust command via its parameters (e.g. passed from `loopClaude`)
- [ ] Existing tests updated to reflect the new prompt
- [ ] `bun test` and `bun run check` pass

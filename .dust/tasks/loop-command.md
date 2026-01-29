# Implement Loop Command

Add a `dust loop` command that implements continuous Claude iteration on available tasks.

## Usage

```bash
dust loop
```

The command invokes Claude Code to work on tasks continuously.

## Behavior

1. Sync with remote (git pull) to get latest tasks
2. Check if there's work available via `dust next`
3. If no work available, sleep and retry
4. If work available, invoke Claude Code with the appropriate prompt
5. Repeat until interrupted

## Implementation Notes

- Should be implemented in TypeScript as a new command in `lib/cli/commands/`
- Should handle git pull failures gracefully (repo might not have a remote)
- Stream output from the spawned Claude process
- Implement Claude spawning and streaming infrastructure in `lib/claude/`

## Future Scope

Support for other agents (aider, codex, custom commands) can be added later. For now, this command is Claude-specific.

## Goals

- [Agent autonomy](../goals/agent-autonomy.md)

## Blocked by

(none)

## Definition of done

- [ ] `dust loop` command exists and can be invoked from the CLI
- [ ] Command syncs with remote (git pull) before checking for work
- [ ] Command uses `dust next` to check for available tasks
- [ ] Command invokes Claude Code when work is available
- [ ] Command sleeps and retries when no work is available
- [ ] Output from Claude process is streamed to stdout
- [ ] Git pull failures are handled gracefully

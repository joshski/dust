# Iterate Command

A `dust iterate` command that implements a "ralph loop" - an automated iteration loop for running agents continuously on available tasks.

## Behavior

1. Sync with remote (git pull) to get latest tasks
2. Check if there's work available via `dust next`
3. If no work available, sleep for a configurable interval and retry
4. If work available, invoke the configured agent command
5. Repeat until max iterations reached or interrupted

## Options

- `--max-iterations` / `-n`: Maximum number of work iterations (default: 10)
- `--sleep-interval`: How long to sleep when no work available (default: 60s)
- `--no-sync`: Skip git pull sync step
- `--agent-command`: Command to invoke the agent (overrides config)

## Configuration

The agent command should be configurable in `.dust/config.json` or similar:

```json
{
  "iterate": {
    "agentCommand": "claude -p 'get to work' --dangerously-skip-permissions"
  }
}
```

This keeps dust agent-agnostic - teams can use Claude, Cursor, Aider, or any other agent.

## Example usage

```
dust iterate --max-iterations 5
dust iterate -n 20 --agent-command "aider --yes-always"
```

## Implementation notes

- Should be implemented in TypeScript, not as a shell script wrapper
- Sleep iterations (when no work available) should not count toward max iterations
- Should handle git pull failures gracefully (repo might not have a remote)
- Consider streaming/logging output from the spawned agent process
- The name "ralph loop" is a playful reference, but the command should be `dust iterate`

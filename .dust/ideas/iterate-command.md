# Iterate Command

A `dust iterate` command that implements a "ralph loop" - an automated iteration loop for running agents continuously on available tasks.

## Behavior

1. Sync with remote (git pull) to get latest tasks
2. Check if there's work available via `dust next`
3. If no work available, sleep for a configurable interval and retry
4. If work available, spawn a Claude agent to work on it
5. Repeat until max iterations reached or interrupted

## Options

- `--max-iterations` / `-n`: Maximum number of work iterations (default: 10)
- `--sleep-interval`: How long to sleep when no work available (default: 60s)
- `--no-sync`: Skip git pull sync step

## Example usage

```
dust iterate --max-iterations 5
dust iterate -n 20 --sleep-interval 30
```

## Implementation notes

- Should be implemented in TypeScript, not as a shell script wrapper
- Sleep iterations (when no work available) should not count toward max iterations
- Should handle git pull failures gracefully (repo might not have a remote)
- Consider streaming/logging output from the spawned Claude process
- The name "ralph loop" is a playful reference, but the command should be `dust iterate`

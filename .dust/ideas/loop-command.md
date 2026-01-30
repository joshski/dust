# Loop Command Extensions

Extensions to the existing loop command for additional agents and options.

## Current State

The `dust loop claude` command is implemented with max iterations support. This idea tracks remaining enhancements.

## Additional Agents

Support for other popular agents beyond Claude:

```bash
dust loop aider 10
dust loop codex 5
```

## Additional Options

- `--sleep-interval`: How long to sleep when no work available (default: 30s)
- `--no-sync`: Skip git pull sync step

## Custom Agent Command

For agents Dust doesn't know about:

```bash
dust loop --agent-command "my-custom-agent --prompt" 10
```

## Implementation Notes

- Agent adapters should know how to pass the prompt to each agent correctly
- Consider streaming/logging output from the spawned agent process

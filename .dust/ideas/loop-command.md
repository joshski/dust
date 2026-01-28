# Loop Command

A `dust loop` command that implements continuous agent iteration on available tasks.

## Usage

```bash
dust loop claude
dust loop aider
dust loop codex
```

The agent name is required - Dust works with multiple agents without favoring one.

## Behavior

1. Sync with remote (git pull) to get latest tasks
2. Check if there's work available via `dust next`
3. If no work available, sleep for a configurable interval and retry
4. If work available, invoke the specified agent with the appropriate prompt
5. Repeat until max iterations reached or interrupted

## Options

- `--max-iterations` / `-n`: Maximum number of work iterations (default: 10)
- `--sleep-interval`: How long to sleep when no work available (default: 60s)
- `--no-sync`: Skip git pull sync step

## Supported Agents

Dust has built-in support for popular agents:

- `claude` - Anthropic's Claude Code CLI
- `aider` - Aider coding assistant
- `codex` - OpenAI Codex CLI

For agents Dust doesn't know about, use `--agent-command`:

```bash
dust loop --agent-command "my-custom-agent --prompt"
```

## Example Usage

```bash
dust loop claude --max-iterations 5
dust loop aider -n 20
dust loop --agent-command "cursor-agent --message"
```

## Implementation Notes

- Should be implemented in TypeScript, not as a shell script wrapper
- Sleep iterations (when no work available) should not count toward max iterations
- Should handle git pull failures gracefully (repo might not have a remote)
- Consider streaming/logging output from the spawned agent process
- Agent adapters should know how to pass the prompt to each agent correctly

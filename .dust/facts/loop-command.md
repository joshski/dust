# Loop Command

The `dust loop` command runs an AI agent repeatedly, picking up tasks until the iteration limit is reached. Supported agents: `dust loop claude` (Claude Code) and `dust loop codex` (OpenAI Codex).

```bash
npx dust loop claude [max-iterations]
```

- `max-iterations`: Maximum number of task iterations (default: 10)
- Sleep iterations (when no tasks are available) do not count toward the limit

Examples:
```bash
npx dust loop claude      # Run up to 10 iterations
npx dust loop claude 5    # Run up to 5 iterations
```

The loop:
1. Syncs with remote (`git pull`)
   - If git pull fails (e.g., merge conflicts), the agent is spawned to resolve the issue
   - The agent receives the error message and is instructed to resolve and push
2. Checks for available tasks (`dust next`)
3. If a task exists, runs the agent to implement it
4. Increments the iteration counter
5. Sleeps for 30 seconds (printing one `.` per second for visible idle progress), then repeats

The loop exits when max iterations are reached or you interrupt it (Ctrl+C).

Because agents run autonomously and can modify files and execute code, you should run this in a [sandboxed environment](./autonomous-agents-need-sandboxes.md).

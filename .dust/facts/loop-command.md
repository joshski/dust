# Loop Command

The `dust loop claude` command runs Claude Code repeatedly, picking up tasks until the iteration limit is reached.

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
1. Checks for available tasks (`dust next`)
2. If a task exists, runs Claude to implement it
3. Increments the iteration counter
4. Waits briefly, then repeats

The loop exits when max iterations are reached or you interrupt it (Ctrl+C).

Because agents run autonomously and can modify files and execute code, you should run this in a [sandboxed environment](./autonomous-agents-need-sandboxes.md).

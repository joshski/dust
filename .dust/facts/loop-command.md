# Loop Command

The `dust loop` command runs Claude Code repeatedly, picking up tasks until none remain.

```bash
npx dust loop
```

The loop:
1. Checks for available tasks (`dust next`)
2. If a task exists, runs Claude to implement it
3. Waits briefly, then repeats

The loop continues until no tasks remain or you interrupt it (Ctrl+C).

Because agents run autonomously and can modify files and execute code, you should run this in a [sandboxed environment](./autonomous-agents-need-sandboxes.md).

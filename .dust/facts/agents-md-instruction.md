# AGENTS.md Instruction

The `dust init` command adds an instruction to both `AGENTS.md` and `CLAUDE.md` so that AI agents discover the dust workflow.

The instruction it adds (creating the files if needed):

```markdown
Always immediately run `npx dust agent` when you start working in this repository.
```

The [`dust agent`](./unified-cli.md) command guides agents to available tasks and project context.

We write to both files because Claude Code doesn't yet read `AGENTS.md` ([issue #6235](https://github.com/anthropics/claude-code/issues/6235)).

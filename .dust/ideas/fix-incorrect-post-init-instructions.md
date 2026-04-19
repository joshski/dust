# Fix Incorrect Post-Init Instructions

The `dust init` command displays next-step instructions after initialization. These instructions include example commands for adding ideas and tasks using `claude` and `codex`. However, the code incorrectly prepends the `runner` prefix (extracted from `dustCommand`) to these commands.

## Context

In `lib/cli/commands/init.ts`, line 174 extracts a `runner` variable:

```ts
const runner = dustCommand.split(' ')[0]
```

If `dustCommand` is `bunx dust`, then `runner` is `bunx`. This `runner` is then used as a prefix for `claude` and `codex` in the post-init output:

```ts
context.stdout(`   > ${runner} claude "Idea: friendly UI for non-technical users"`)
context.stdout(`   > ${runner} codex "Task: set up code coverage"`)
context.stdout(`   > ${runner} claude "Add principles and facts based on the code in this repository"`)
```

This produces incorrect instructions like `bunx claude "..."` and `bunx codex "..."` when `dustCommand` is `bunx dust`. The `claude` and `codex` CLIs are standalone tools that users invoke directly, not subcommands of `bunx`.

## Fix

The post-init example commands should use `claude` and `codex` directly, without any runtime prefix. The `runner` variable is only appropriate for the dust command itself (e.g., `bunx dust agent`), not for other CLI tools.

The simplest fix is to use the literal strings `claude` and `codex` in these output lines, removing the `runner` prefix.

## Open Questions

### Should the example commands ever use a non-`claude`/`codex` prefix?

In some environments, users might invoke `claude` via `npx claude` or `bunx claude`. The current approach of using `runner` was likely an attempt to infer the right prefix from context.

#### Option: Always use bare `claude` and `codex`

Use `claude` and `codex` as literal strings in the output. These are well-known CLIs and most users have them installed globally. Simpler and correct in the common case.

#### Option: Detect the agent command separately from the dust command

Introduce a separate detection mechanism (analogous to `detectDustCommand`) for agent CLIs. This could check for local installations and suggest `npx claude` or `bunx claude` when appropriate. More accurate but adds complexity.

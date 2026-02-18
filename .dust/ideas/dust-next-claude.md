# dust next claude

Add a command which runs a single iteration of the loop, equivalent to `dust loop claude 1`. The same pattern would apply to codex: `dust next codex` would be equivalent to `dust loop codex 1`.

## Context

The `dust loop claude [N]` command runs N iterations (default 10) of the agent loop. Each iteration:
1. Syncs with remote (`git pull`)
2. Checks for available tasks via `dust next`
3. If a task exists, runs the agent to implement it
4. Sleeps and repeats (or exits if iteration limit reached)

A `dust next claude` command would provide a convenient shorthand for running exactly one iteration without needing to specify the iteration count explicitly.

## Implementation Approach

The `runOneIteration` function in `lib/cli/commands/loop.ts:299` already encapsulates the logic for a single iteration. A new command would simply:
1. Call `runOneIteration` once
2. Exit immediately after (no sleep/loop behavior)

The command could be registered in `lib/cli/main.ts` as `next claude` and `next codex`, following the existing multi-word command pattern.

## Open Questions

### What should the command name be?

#### Option: `next claude`

Extends the existing `next` command semantically: "show next tasks" vs "do the next task". Natural reading: "dust next claude" = "dust, let claude do the next task".

#### Option: `run claude`

Clearer distinction from `dust next` (listing vs executing). More explicit action verb. Avoids potential confusion about whether it lists or executes.

### Should `dust next` without an agent argument change behavior?

#### Option: Keep as listing only

No breaking change. Clear distinction: `next` = list, `next <agent>` = run. Maintains backwards compatibility.

#### Option: Make interactive

Could prompt user: "Found 3 tasks. Run with an agent? [claude/codex/list only]". More helpful for new users but would be a breaking change for scripts that rely on current behavior.

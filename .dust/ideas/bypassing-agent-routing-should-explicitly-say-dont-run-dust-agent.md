# Bypassing agent routing should explicitly say "Don't run dust agent"

When `dust loop` and `dust bucket` invoke Claude Code, they construct task-specific prompts directly rather than relying on `dust agent` for routing. However, users may have CLAUDE.md configured with instructions to run `bin/dust agent` immediately (as recommended by `dust init`).

This creates a potential conflict: the agent receives a direct task prompt but may also be instructed via CLAUDE.md to run `dust agent` first, which would be redundant or confusing since the task is already specified.

## Current behavior

Both `dust loop` (in `lib/cli/commands/loop.ts:311-323`) and `dust bucket` (via `runRepositoryLoop` in `lib/bucket/repository.ts`) build prompts using `buildImplementationInstructions()` that specify:
1. Run install command
2. Implement the specific task
3. Instructions for committing

The prompts don't mention that `dust agent` routing should be skipped.

## Proposed change

The prompts constructed by `dust loop` and `dust bucket` should explicitly state something like:

> "Note: Do not run `dust agent` - this task has been assigned directly and you should proceed with implementation."

This prevents confusion when agents encounter both the CLAUDE.md instruction and the direct task prompt.

## Relevant locations

- `lib/cli/commands/loop.ts` - `runOneIteration()` function constructs the task prompt (lines 311-323)
- `lib/cli/commands/focus.ts` - `buildImplementationInstructions()` generates implementation steps
- `lib/bucket/repository.ts` - Uses the same loop iteration logic
- `.dust/facts/agents-md-instruction.md` - Documents that `dust init` adds "run `dust agent`" to CLAUDE.md

## Open Questions

### Where should the message be added?

#### Add to `buildImplementationInstructions()`

Centralized location that both `dust loop` and `dust bucket` use. Keeps the guidance consistent across all automated invocations.

#### Add directly to the prompt in `runOneIteration()`

More explicit and visible in the prompt construction code. Allows for context-specific variations.

### Should git conflict resolution prompts also include this guidance?

The git conflict prompts (lines 251-260 in loop.ts) invoke Claude to resolve merge conflicts. These are also automated invocations where running `dust agent` would be inappropriate.

#### Yes, include in all automated prompts

Consistency across all invocation types. Prevents confusion in any automated scenario.

#### No, only for task implementation prompts

Conflict resolution is a different context; the agent might benefit from `dust agent` for understanding repository structure when resolving complex conflicts.

### What wording should be used?

#### "Don't run dust agent"

Short and direct. Matches the task description.

#### "This task was assigned directly by dust loop - no routing needed"

More explanatory, helps the agent understand why the instruction differs from CLAUDE.md.

#### "Note: Skip the `dust agent` step - your task has already been specified below"

Balances brevity with explanation.

### Should an environment variable signal this state?

#### Set `DUST_SKIP_AGENT=1` or similar

The `dust agent` command could detect this and provide helpful feedback if invoked anyway, like "You're running in an automated loop - proceeding to implement the assigned task."

#### No environment variable, rely on prompt instructions only

Simpler implementation. Environment variables add complexity and the prompt instruction should be sufficient for a capable agent.

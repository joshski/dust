# Bypass dust agent in loop and bucket

When running in `dust loop` or `dust bucket` mode, the agent currently navigates through multiple command outputs to pick and start a task. This consumes context window tokens inefficiently. Instead, the looping infrastructure should directly select the next task and pass it to the agent with implementation instructions embedded in the initial prompt.

## Current Flow

1. Loop calls: `Run \`${installCommand} && ${dustCommand} agent && ${dustCommand} pick task\``
2. Agent receives the agent greeting (routing menu)
3. Agent runs `dust next` to see available tasks
4. Agent reads the task file
5. Agent runs `dust focus "<task name>"` to get implementation instructions
6. Agent implements the task

This multi-step navigation wastes context window tokens on CLI output that serves human users but provides no value when the infrastructure already knows the goal is "pick the next task and implement it."

## Proposed Change

The loop command should:
1. Call `dust next` internally to identify the next task
2. Read the task file content
3. Emit a `task.started` event with task metadata
4. Pass a prompt to Claude containing:
   - The task title
   - The task file body
   - Implementation instructions (the same content currently shown by `dust focus`)

This bypasses the agent greeting menu entirely and eliminates the need for the agent to run multiple dust commands just to determine what to work on.

## Benefits

- **Context window efficiency**: Saves tokens currently spent on routing menus, command outputs, and the agent's decision-making about which command to run. This directly supports [Context Window Efficiency](../goals/context-window-efficiency.md).
- **Faster startup**: The agent receives its task immediately instead of navigating through commands.
- **Cleaner event stream**: A `task.started` event can be emitted before Claude starts, giving observers immediate visibility into what task is being worked on.

## Relevant Code

- `lib/cli/commands/loop.ts:307` - Current prompt construction
- `lib/bucket/repository.ts:258-260` - Bucket's run wrapper calling the same prompt
- `lib/cli/commands/focus.ts` - Implementation instructions template
- `lib/cli/commands/next.ts` - Task selection logic

## Open Questions

### Should this change apply only to loop/bucket, or also to interactive use?

#### Loop/bucket only

The `dust agent` greeting remains valuable for interactive sessions where a human types "go" or "work on auth" and the agent needs to interpret intent. Only the unattended loop and bucket modes bypass the greeting because the intent is always "pick next task and implement it." This keeps the behavior change minimal and scoped to autonomous contexts.

#### Also bypass for `dust pick task` in interactive mode

Even in interactive sessions, when the user explicitly runs `dust pick task`, the agent's job is clear: pick a task from the backlog. The greeting's routing logic adds no value here. This could extend the optimization to any context where task selection is explicit, but it changes the interactive experience and may have edge cases.

### How should error handling work when no tasks are available?

#### Return early with an event

If `dust next` returns no tasks, emit a `loop.no_tasks` event (already exists) and sleep without spawning Claude at all. This is the current behavior and remains correct. The prompt construction only happens when a task exists.

#### Let Claude handle it

Pass a prompt explaining no tasks are available and let Claude respond. This wastes tokens but might be useful if Claude could do something productive (like checking for new ideas to promote). In practice, the current behavior of sleeping and retrying is simpler.

### Should the prompt include the raw task file or a processed version?

#### Raw task file content

Include the markdown file contents verbatim. Simple to implement, and Claude is good at parsing markdown. The agent can see exactly what humans see when they read the task file.

#### Processed/structured data

Extract specific fields (title, description, definition of done, blocked by) into a structured format in the prompt. Potentially clearer but requires maintaining a transformation layer. If task file format changes, the processor must be updated.

### What happens if the task is blocked?

#### Caller ensures task is unblocked before passing

The `dust next` command already filters to unblocked tasks. If next returns a task, it's unblocked by definition. The prompt construction doesn't need to handle this case.

#### Include blocker status in prompt anyway

Even though next only returns unblocked tasks, including a "Blocked By: (none)" section makes the context explicit. This is defensive but adds tokens for no runtime value if next already guarantees unblocked tasks.

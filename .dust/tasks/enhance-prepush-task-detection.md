# Enhance Pre-push Task Detection

The pre-push git hook should detect when Claude Code Web attempts to push a branch containing only a new task file (with optional idea deletions) and remind the agent to implement the task.

Currently, an agent can add a task to `.dust/tasks/` and push without implementing it. This change will catch that pattern and fail with a helpful message instructing the agent to start a sub-agent for implementation.

## Rationale

Claude Code Web should always attempt to implement any new task it creates. Currently, an agent can add a task and push without actually implementing it, which creates unnecessary back-and-forth with the developer. This detection minimizes that friction by catching the mistake early.

## Implementation Details

Modify `lib/cli/commands/pre-push.ts` to:

1. Before running `dust check`, analyze the commits being pushed
2. Use git to determine which files are being added/modified/deleted in the push
3. Detect if ALL changes match this pattern:
   - Only files in `.dust/tasks/` are being added
   - Only files in `.dust/ideas/` are being deleted (optional)
   - No other files are being changed
4. If this pattern is detected, output a failure message and exit with code 1

The failure message should include:
- A clear explanation of what was detected
- The instruction: "Start a new sub-agent to implement the task: `bin/dust agent implement task`"
- The path to the new task file

## Goals

- [Agent Autonomy](../goals/agent-autonomy.md)
- [Fast Feedback](../goals/fast-feedback.md)

## Blocked by

(none)

## Definition of done

- [ ] Pre-push hook detects when only task files are added (and optionally ideas deleted)
- [ ] Helpful error message is displayed with instructions to run `bin/dust agent implement task`
- [ ] Normal pushes (with implementation changes) still pass
- [ ] Tests cover the detection logic and edge cases

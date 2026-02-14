# Loop-Specific Commands

When running a loop (`dust loop` or `dust bucket`), the agent sees full "routing" instructions from `dust agent`. This is unnecessary in a loop context because we already know what the agent should do — it should immediately pick a task and start working.

Loop-specific commands could skip the routing step and directly instruct the agent to pick a task, reducing wasted tokens and latency at the start of each iteration.

## Open Questions

### How should the loop-specific prompt be delivered?

#### Replace the `dust agent` call in loop iterations

The loop runner would invoke a different command (e.g., `dust pick task` directly) instead of `dust agent`, so the agent never sees the routing menu.

#### Add a flag to `dust agent`

A flag like `dust agent --loop` would suppress the routing instructions and immediately output the "pick a task" prompt.

#### Detect loop context automatically

`dust agent` could detect that it's running inside a loop (e.g., via an environment variable set by the loop runner) and skip routing instructions without any flag.

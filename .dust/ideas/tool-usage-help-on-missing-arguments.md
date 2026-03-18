# Tool Usage Help on Missing Arguments

When a tool is called with no arguments and has required parameters, show a help message with the parameter schema. Tool families already do this; extend it to all tools.

## Context

Tool prompts were recently simplified to show only tool name and description, omitting parameter schemas to save context window space. The agent is expected to discover schemas by running the tool. But currently, non-family tools have no discovery mechanism — they just execute with whatever args are given, likely producing an unhelpful server error when required args are missing.

Tool families already have this pattern via `formatToolFamilyHelp` in `lib/bucket/tool-prompt.ts`, which renders detailed sub-tool help when a family is invoked without specifying a sub-tool.

## Design

Apply a simple universal rule: **if a tool is invoked with zero arguments and it has any required parameters, show help instead of executing.** Tools with only optional parameters (e.g. `sessions`) execute normally with no args, since that's a valid call.

This keeps the behavior unsurprising — tools that *can* do something useful with no args still do, while tools that *need* args give the agent what it needs to retry correctly.

## Possible Approach

In `bucket-tool.ts`, before calling `executeToolViaProxy` for a non-family tool, check whether `toolArgs` is empty and the tool has any required parameters. If so, format and return a help message showing the tool's parameters and usage, rather than forwarding the request to the server.

The existing `formatParameter` helper in `tool-prompt.ts` can be reused to render the parameter list. A new `formatToolHelp` function (analogous to `formatToolFamilyHelp`) could render the full schema for a single tool.

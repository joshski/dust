# Migrate Asset Upload to Server-Defined Tool

Replace the hardcoded `dust bucket asset upload` command with a generic tool executor that runs server-defined tools. The asset upload becomes the first server-defined tool, dogfooding the system.

## Context

This task completes the server-defined tools feature. The previous tasks established the protocol and prompt injection; this task provides the execution mechanism.

Key decisions:
- The hardcoded `bucket asset upload` command is removed
- A new `dust bucket tool <name> [args]` command executes server-defined tools
- The server sends asset-upload as a tool definition
- File validation (size, extensions) moves to server-side

## Implementation

1. Add `lib/bucket/tool-executor.ts`:
   - Accept a tool definition and arguments
   - Execute HTTP request to the tool's endpoint
   - Handle file parameters (read file, send as multipart)
   - Return result or error

2. Add `dust bucket tool <name>` command:
   - Look up tool by name from stored definitions
   - Map CLI arguments to tool parameters
   - Call the tool executor
   - Output result to stdout

3. Remove `bucket-asset-upload.ts` and its CLI registration

4. Update [Bucket Asset Upload](../facts/bucket-asset-upload.md) fact to reflect the new command syntax (`dust bucket tool asset-upload <file>`)

## Principles

- [Decoupled Code](../principles/decoupled-code.md) - Tool executor is independent of specific tools
- [Dependency Injection](../principles/dependency-injection.md) - HTTP client and file operations are injected for testability
- [Actionable Errors](../principles/actionable-errors.md) - Tool execution errors should explain what went wrong and how to fix it

## Blocked By

- [Inject Tools Into Agent Prompts](inject-tools-into-agent-prompts.md)

## Definition of Done

- [ ] `dust bucket tool <name> [args]` command executes server-defined tools
- [ ] Tool executor handles file parameters via multipart upload
- [ ] Hardcoded `bucket-asset-upload.ts` is removed
- [ ] Tests verify tool execution with stubbed HTTP responses
- [ ] [Bucket Asset Upload](../facts/bucket-asset-upload.md) fact updated with new syntax

# Configure apiKeyHelper for Docker Containers

Update Docker container spawn logic to configure Claude Code's `apiKeyHelper` setting. This enables containers to fetch helper tokens from the host gateway.

## Context

With the token endpoint available on the Claude API proxy, containers need to be configured to use `apiKeyHelper` instead of receiving API keys via environment variables. This completes the secure-by-default container authentication flow.

The `apiKeyHelper` setting tells Claude Code to execute a command to get its API key rather than reading from environment variables.

## Changes

1. **Update `lib/claude/spawn-claude-code.ts`**:
   - When `claudeApiProxyUrl` is configured, create a settings file with `apiKeyHelper` command
   - The helper command should fetch from `<proxy-url>/token` (e.g., `curl -fsS --max-time 2 http://host.docker.internal:3002/token | tr -d '\n'`)
   - Mount the settings file into the container and pass `--settings <path>`
   - Remove the dummy `ANTHROPIC_AUTH_TOKEN=proxy-managed` approach

2. **Update `lib/loop/loop.ts`** (if needed):
   - Ensure temp settings file is created in a location that can be mounted
   - Clean up temp file after container exits

3. **Add integration test or update existing Docker tests**:
   - Verify container uses apiKeyHelper flow
   - Verify no OAuth token in container environment

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md): Settings generation is pure, file I/O at boundaries
- [Design for Testability](../principles/design-for-testability.md): Settings generation can be tested without Docker

## Blocked By

- [Add Token Endpoint to Claude API Proxy](add-token-endpoint-to-claude-api-proxy.md)

## Definition of Done

- Docker containers use `apiKeyHelper` to fetch helper tokens
- No `CLAUDE_CODE_OAUTH_TOKEN` or `ANTHROPIC_AUTH_TOKEN` in container environment
- Settings file is properly mounted and cleaned up
- Existing Docker agent tests pass
- `dust loop claude` works with Docker mode

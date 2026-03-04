# Build Claude API Proxy Server

Create an HTTP proxy that handles Claude Code API calls from Docker containers. The container sends API requests to the proxy on the host, and the proxy injects the OAuth token before forwarding to the Anthropic API.

This allows removing:
- `CLAUDE_CODE_OAUTH_TOKEN` environment variable from containers
- `~/.claude` mount (currently read-write for OAuth token refresh)
- `~/.claude.json` mount

The proxy handles token management (including refresh) on the host side.

## Blocked By

- [Build Git Credential Proxy Server](build-git-credential-proxy.md)

## Definition of Done

- [ ] HTTP proxy that forwards requests to the Anthropic API with OAuth token injected
- [ ] Handles OAuth token refresh on the host side
- [ ] `CLAUDE_CODE_OAUTH_TOKEN` no longer passed as env var to containers
- [ ] `~/.claude` and `~/.claude.json` no longer mounted in containers
- [ ] Claude Code inside the container can make API calls through the proxy
- [ ] Tests covering the proxy logic

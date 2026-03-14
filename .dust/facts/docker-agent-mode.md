# Docker Agent Mode

When a repository contains a `.dust/Dockerfile`, dust automatically builds the image and spawns agent sessions inside Docker containers. This provides the [sandboxing](./autonomous-agents-need-sandboxes.md) recommended for autonomous agents.

`dust lint` now rejects `.dust/Dockerfile` and points users to migrate Docker-related configuration under [`.dust/config/`](../config).

## Setup

1. Create `.dust/Dockerfile` in your repository
2. The Dockerfile must create a **non-root user** — Claude Code refuses `--dangerously-skip-permissions` when running as root
3. Install Claude Code (`npm install -g @anthropic-ai/claude-code`) in the image

Example:
```dockerfile
FROM oven/bun:1
RUN apt-get update && apt-get install -y git nodejs npm && rm -rf /var/lib/apt/lists/*
RUN npm install -g @anthropic-ai/claude-code
RUN useradd -m -s /bin/bash user
USER user
WORKDIR /workspace
```

## Authentication

Docker containers cannot access the host's keychain. Authentication is handled through proxies on the host:

- **Claude API Proxy**: When `claudeApiProxyUrl` is configured, API calls to Anthropic route through a host-side proxy that injects the OAuth token. The container sees `ANTHROPIC_BASE_URL` pointing to the proxy, and `~/.claude` is not mounted.
- **OPENAI_API_KEY**: Required for Codex agent mode, passed as an environment variable.

Without the API proxy, `CLAUDE_CODE_OAUTH_TOKEN` must be set and `~/.claude` is mounted for token refresh. If neither is available when Docker mode is detected, dust exits early with an error message.

## How it works

- `hasDockerfile()` checks for `.dust/Dockerfile` in the repo
- `buildDockerImage()` builds the image with a tag derived from the repo path
- Agent sessions are spawned with `docker run`, mounting the repo at `/workspace`
- When using the Claude API proxy, `~/.claude` and `~/.claude.json` are NOT mounted (credentials stay on host)
- Both `dust loop` and `dust bucket worker` support Docker mode

## Git Access

Docker containers do not mount `~/.ssh` or `~/.gitconfig` from the host, preventing credential exposure. Instead, git operations route through a host-side credential proxy:

- When `gitProxyUrl` is configured in the Docker spawn config, the container's git is configured to rewrite URLs via `GIT_CONFIG_*` environment variables
- The proxy (e.g., `http://host.docker.internal:3001`) handles authentication by running `git credential fill` on the host
- Both `https://github.com/` and `git@github.com:` URLs are rewritten to use the proxy

# Docker Agent Mode

Dust runs agent sessions inside Docker containers when `.dust/config/container/Dockerfile` exists. This provides the [sandboxing](./autonomous-agents-need-sandboxes.md) recommended for autonomous agents.

The legacy path `.dust/Dockerfile` is not supported. `dust lint` reports a migration error, and runtime exits early with the same message.

## Opt-in via --docker flag

The `--docker` flag enables Docker execution without a custom Dockerfile:

- `dust loop --docker` — run loop iterations in Docker using the bundled default image
- `dust bucket worker --docker` — run all repository agents in Docker

When `--docker` is passed and no custom `.dust/config/container/Dockerfile` exists, dust uses a bundled default Dockerfile that includes both agent CLIs (Claude Code and Codex). If a custom Dockerfile exists, it takes precedence.

## Setup

1. Create `.dust/config/container/Dockerfile` in your repository
2. The Dockerfile must create a **non-root user** — Claude Code refuses `--dangerously-skip-permissions` when running as root
3. Install the agent CLIs you plan to run in Docker:
   - Claude provider: `npm install -g @anthropic-ai/claude-code`
   - Codex provider: `npm install -g @openai/codex`

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

- **Claude API Proxy with apiKeyHelper**: When `claudeApiProxyUrl` is configured, Claude Code is configured to use `apiKeyHelper` to fetch short-TTL helper tokens from the proxy's `/token` endpoint. The container sees `ANTHROPIC_BASE_URL` pointing to the proxy and uses `--settings` with a mounted settings file containing the `apiKeyHelper` command. No OAuth tokens or dummy auth tokens are passed to the container environment.
- **OPENAI_API_KEY**: Required for Codex agent mode, passed as an environment variable.

Without the API proxy, `CLAUDE_CODE_OAUTH_TOKEN` must be set and `~/.claude` is mounted for token refresh. For Codex in Docker, `OPENAI_API_KEY` is passed through when set, and `CODEX_HOME` is mounted into the container.

## How it works

- `hasDockerfile()` checks for `.dust/config/container/Dockerfile` in the repo
- `hasLegacyDockerfile()` checks for `.dust/Dockerfile` and fails fast with migration guidance
- `getDefaultDockerfilePath()` returns the path to the bundled default Dockerfile at `lib/docker/default.Dockerfile`
- `buildDockerImage()` builds the image with a tag derived from the repo path
- `prepareDockerConfig()` accepts a `forceDocker` option that uses the bundled default when no custom Dockerfile exists
- Agent sessions are spawned with `docker run`, mounting the repo at `/workspace`
- When using the Claude API proxy, `~/.claude` and `~/.claude.json` are NOT mounted (credentials stay on host)
- Both `dust loop` and `dust bucket worker` support Docker mode

## Git Access

Docker containers do not mount `~/.ssh` or `~/.gitconfig` from the host, preventing credential exposure. Instead, git operations route through a host-side credential proxy:

- When `gitProxyUrl` is configured in the Docker spawn config, the container's git is configured to rewrite URLs via `GIT_CONFIG_*` environment variables
- The proxy (e.g., `http://host.docker.internal:3001`) handles authentication by running `git credential fill` on the host
- Both `https://github.com/` and `git@github.com:` URLs are rewritten to use the proxy

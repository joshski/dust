# Docker Agent Mode

When a repository contains a `.dust/Dockerfile`, dust automatically builds the image and spawns agent sessions inside Docker containers. This provides the [sandboxing](./autonomous-agents-need-sandboxes.md) recommended for autonomous agents.

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

Docker containers cannot access the host's keychain, so authentication requires environment variables:

- **`CLAUDE_CODE_OAUTH_TOKEN`** — required for Claude Code. Obtain it with `claude setup-token` on the host, then export it before running dust.
- **`OPENAI_API_KEY`** — required for Codex agent mode.

These environment variables are automatically passed through to the container. If `CLAUDE_CODE_OAUTH_TOKEN` is not set when Docker mode is detected, dust exits early with an error message.

## How it works

- `hasDockerfile()` checks for `.dust/Dockerfile` in the repo
- `buildDockerImage()` builds the image with a tag derived from the repo path
- Agent sessions are spawned with `docker run`, mounting the repo at `/workspace` and the user's config at `/home/user/`
- Both `dust loop` and `dust bucket worker` support Docker mode

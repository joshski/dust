# Bucket Worker Container Modes

The `dust bucket worker` command can run agent sessions in containers for sandboxing. Two container runtimes are supported:

## Docker Container Mode

Use the `--docker` flag to run all agent sessions in Docker containers:

```bash
dust bucket worker --docker
```

This uses the default bundled Dockerfile if no custom `.dust/config/container/Dockerfile` exists. See [Docker Agent Mode](./docker-agent-mode.md) for details about Docker container configuration.

## Apple Container Mode

Use the `--apple-container` flag to run agent sessions using Apple's container runtime (macOS 26+ on Apple Silicon):

```bash
dust bucket worker --apple-container
```

Apple Container (https://github.com/apple/container) runs Linux containers as lightweight VMs and uses OCI-compatible images, so existing Dockerfiles work without modification.

**Note:** You cannot use both `--docker` and `--apple-container` flags simultaneously. Choose one container runtime.

## Claude Authentication

When using Claude Code as your agent provider in container mode, you need to set up authentication:

1. Run `claude setup-token` on your host machine to authenticate
2. Set the `CLAUDE_CODE_OAUTH_TOKEN` environment variable

Without the Claude API proxy, the container will mount `~/.claude` for token refresh. With the API proxy configured, authentication is handled through the host proxy's `/token` endpoint (see [Docker Agent Mode](./docker-agent-mode.md) for details).

## Custom Dockerfile

To provide a custom Dockerfile for container mode:

1. Create `.dust/config/container/Dockerfile` in your repository
2. The Dockerfile must create a **non-root user** (Claude Code requires this)
3. Install the agent CLIs you plan to run:
   - Claude provider: `npm install -g @anthropic-ai/claude-code`
   - Codex provider: `npm install -g @openai/codex`

Example custom Dockerfile:

```dockerfile
FROM oven/bun:1
RUN apt-get update && apt-get install -y git nodejs npm && rm -rf /var/lib/apt/lists/*
RUN npm install -g @anthropic-ai/claude-code
RUN useradd -m -s /bin/bash user
USER user
WORKDIR /workspace
```

When a custom Dockerfile exists at `.dust/config/container/Dockerfile`, both `--docker` and `--apple-container` modes will use it. If no custom Dockerfile exists, the bundled default Dockerfile is used (which includes both Claude Code and Codex).

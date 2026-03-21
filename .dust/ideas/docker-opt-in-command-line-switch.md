# Docker opt-in command line switch

Add a `--docker` flag to `dust bucket worker` and `dust loop` commands that enables Docker execution without a custom Dockerfile.

## Why this matters

Before making Docker the default runtime (see [Docker by default for agent runtime](docker-by-default-for-agent-runtime.md)), users should be able to opt in to Docker execution to validate the experience. This provides:

- Early feedback on Docker-based agent execution
- A migration path for users who want isolation before it becomes default
- A way to test generated container configurations

## Current behavior

Docker mode only activates when `.dust/config/container/Dockerfile` exists. The flow in `lib/docker/docker-agent.ts` is:

1. Check for legacy `.dust/Dockerfile` (error if found)
2. Check for `.dust/config/container/Dockerfile`
3. If found, build and use Docker; otherwise run on host

Both `dust loop` (via `runLoop()` in `lib/loop/loop.ts`) and `dust bucket worker` (via `setupDockerConfig()` in `lib/bucket/repository-loop.ts`) use the same `prepareDockerConfig()` function for Docker detection.

## Proposed behavior

Add a `--docker` flag that:

1. When passed, generates a default Dockerfile in a temp location
2. Builds and runs the agent in Docker using this generated config
3. Works even when no `.dust/config/container/Dockerfile` exists

If a custom `.dust/config/container/Dockerfile` exists, it takes precedence over the generated default.

## Implementation scope

### Primary: `dust bucket worker`

The task specifies this should be supported "first and foremost" for `dust bucket worker`. This command manages multiple repositories concurrently, so Docker opt-in could apply at two levels:

- **Worker-level**: `dust bucket worker --docker` enables Docker for all repositories
- **Server-side per-repo**: The dustbucket server could eventually set per-repository Docker preferences

For the initial implementation, worker-level opt-in is simpler and provides immediate value.

### Secondary: `dust loop`

The `dust loop` command operates on a single repository. Adding `--docker` here follows the same pattern but with simpler scope.

## Implementation notes

### For `dust bucket worker`

1. Parse `--docker` flag in bucket worker entry point (`lib/cli/commands/bucket-worker.ts`)
2. Pass flag through `RepositoryDependencies` to `setupDockerConfig()` in `lib/bucket/repository-loop.ts`
3. Extend `prepareDockerConfig()` to accept a `forceDocker` option
4. Generate default Dockerfile content when force-enabled but no custom config exists

### For `dust loop`

1. Parse `--docker` flag in `lib/loop/parse-args.ts` alongside `maxIterations`
2. Pass flag through to `runLoop()` via `LoopDependencies` or a new options parameter
3. Use the same `prepareDockerConfig()` changes from the bucket worker implementation

### Shared: Default Dockerfile generation

Create a `generateDefaultDockerfile()` function in `lib/docker/docker-agent.ts` that produces:

```dockerfile
FROM oven/bun:1
RUN apt-get update && apt-get install -y git nodejs npm && rm -rf /var/lib/apt/lists/*
RUN npm install -g @anthropic-ai/claude-code @openai/codex
RUN useradd -m -s /bin/bash user
USER user
WORKDIR /workspace
```

This matches the example in `docker-agent-mode.md` and includes both agent CLIs for provider flexibility.

## Open Questions

### How should `--docker` interact with existing `.dust/config/container/Dockerfile`?

#### Custom Dockerfile takes precedence (recommended)

When a custom Dockerfile exists and `--docker` is passed, the flag acts as a "force Docker mode" switch. If a custom config exists, use it; otherwise generate a default. This is consistent with the current "custom overrides default" pattern and avoids surprising behavior.

#### Generated config replaces custom

The flag always uses the generated config, ignoring any custom Dockerfile. Simpler to reason about, but potentially confusing if users expect their customizations to apply.

### Should generated Dockerfiles be persisted or ephemeral?

#### Ephemeral (temp file, recommended)

Generate in `os.tmpdir()`, clean up after use. No repo churn, aligns with "easy adoption" principle. The generated content is deterministic and reproducible.

#### Persisted to `.dust/config/container/Dockerfile`

Write the generated file to the canonical location. Makes the config explicit and reviewable, but adds files to the repository. Could optionally prompt user before writing.

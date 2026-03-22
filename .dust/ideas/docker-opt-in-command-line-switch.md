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

1. When passed, uses the bundled default Dockerfile from the dust package
2. Builds and runs the agent in Docker using this config
3. Works even when no `.dust/config/container/Dockerfile` exists

If a custom `.dust/config/container/Dockerfile` exists, it takes precedence over the bundled default.

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
4. Use the bundled default Dockerfile when force-enabled but no custom config exists

### For `dust loop`

1. Parse `--docker` flag in `lib/loop/parse-args.ts` alongside `maxIterations`
2. Pass flag through to `runLoop()` via `LoopDependencies` or a new options parameter
3. Use the same `prepareDockerConfig()` changes from the bucket worker implementation

### Shared: Default Dockerfile bundled in package

Instead of generating Dockerfile content at runtime and writing to a temp file, bundle a static `default.Dockerfile` in the dust package. This approach:

- Uses an existing codebase pattern (`import.meta.dirname` to locate bundled files, as in `lib/biome/index.ts` and `lib/claude/vcr.ts`)
- Avoids temp file management and cleanup
- Makes the default config inspectable and versionable

**Implementation:**

1. Create `lib/docker/default.Dockerfile` with the standard agent image config
2. Add `lib/docker/default.Dockerfile` to package.json `files` array (or ensure `dist` includes it)
3. Locate at runtime via `join(import.meta.dirname, 'default.Dockerfile')`
4. Pass to `docker build -f` directly (no temp file needed)

**Default Dockerfile contents:**

```dockerfile
FROM oven/bun:1
RUN apt-get update && apt-get install -y git nodejs npm && rm -rf /var/lib/apt/lists/*
RUN npm install -g @anthropic-ai/claude-code @openai/codex
RUN useradd -m -s /bin/bash user
USER user
WORKDIR /workspace
```

This matches the example in `docker-agent-mode.md` and includes both agent CLIs for provider flexibility.

## Resolved Decisions

### How should `--docker` interact with existing `.dust/config/container/Dockerfile`?

**Decision:** Custom Dockerfile takes precedence. When a custom Dockerfile exists and `--docker` is passed, the flag acts as a "force Docker mode" switch that uses the custom config. If no custom config exists, use the bundled default. This is consistent with the current "custom overrides default" pattern.

### Should the default Dockerfile be generated at runtime or bundled?

**Decision:** Bundle the default Dockerfile in the dust package (at `lib/docker/default.Dockerfile`). This avoids temp file management and uses an established codebase pattern for locating bundled files via `import.meta.dirname`.

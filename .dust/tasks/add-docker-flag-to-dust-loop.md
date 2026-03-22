# Add --docker flag to dust loop

Add a `--docker` flag to `dust loop` that enables Docker execution using a bundled default Dockerfile when no custom Dockerfile exists.

## Background

Currently, Docker mode only activates when `.dust/config/container/Dockerfile` exists. The `--docker` flag provides an opt-in path for users who want sandboxed agent execution without configuring a custom Dockerfile.

## Implementation

Following the [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md) principle, the implementation separates pure configuration logic from I/O operations.

### Bundle default Dockerfile in package

1. Create `lib/docker/default.Dockerfile` with standard agent image config:

```dockerfile
FROM oven/bun:1
RUN apt-get update && apt-get install -y git nodejs npm && rm -rf /var/lib/apt/lists/*
RUN npm install -g @anthropic-ai/claude-code @openai/codex
RUN useradd -m -s /bin/bash user
USER user
WORKDIR /workspace
```

2. Add `lib/docker/default.Dockerfile` to package.json `files` array
3. Create `getDefaultDockerfilePath()` function that locates it via `import.meta.dirname`

### Parse --docker flag

In `lib/loop/parse-args.ts`, extend the parsing to return both `maxIterations` and `docker`:

```typescript
interface LoopArgs {
  maxIterations: number
  docker: boolean
}

export function parseLoopArgs(args: string[]): LoopArgs
```

### Extend prepareDockerConfig

In `lib/docker/docker-agent.ts`, add a `forceDocker` option to `prepareDockerConfig()`:

```typescript
interface PrepareDockerOptions {
  forceDocker?: boolean
}

export async function prepareDockerConfig(
  repoPath: string,
  dependencies: DockerDependencies,
  onEvent: (event: DockerPrepareEvent) => void,
  options?: PrepareDockerOptions
): Promise<PrepareDockerConfigResult>
```

When `forceDocker` is true and no custom Dockerfile exists, use `getDefaultDockerfilePath()` and pass it to `docker build -f`.

### Wire through dust loop

In `lib/loop/loop.ts`:
1. Parse the `--docker` flag from `dependencies.arguments`
2. Pass `forceDocker: true` to `prepareDockerConfig()` when flag is set

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Agent Autonomy](../principles/agent-autonomy.md)
- [Batteries Included](../principles/batteries-included.md)

## Blocked By

(none)

## Definition of Done

- `dust loop --docker` runs agent iterations inside Docker
- Uses bundled default Dockerfile when no custom config exists
- Custom `.dust/config/container/Dockerfile` takes precedence over default
- Unit tests verify flag parsing and config logic
- The `docker-agent-mode.md` fact is updated to document `--docker` flag

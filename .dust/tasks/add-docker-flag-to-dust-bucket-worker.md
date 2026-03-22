# Add --docker flag to dust bucket worker

Add a `--docker` flag to `dust bucket worker` that enables Docker execution for all repositories.

## Background

The `dust bucket worker` command manages multiple repositories concurrently. The `--docker` flag provides worker-level opt-in to Docker execution, applying to all repositories that don't have custom Docker configs.

## Implementation

This task builds on the existing `--docker` flag infrastructure in `dust loop`, reusing the bundled default Dockerfile at `lib/docker/default.Dockerfile` and the `prepareDockerConfig()` function with `forceDocker` option.

### Parse --docker flag in bucket worker

In `lib/cli/commands/bucket-worker.ts`, parse the `--docker` flag from command arguments and store it in `BucketDependencies`:

```typescript
interface BucketDependencies {
  // ... existing fields
  forceDocker?: boolean
}
```

### Pass through to repository loop

In `lib/bucket/repository.ts` (or `RepositoryDependencies`), add `forceDocker` option that flows to each repository's Docker setup.

### Extend setupDockerConfig in repository-loop

In `lib/bucket/repository-loop.ts`, the `setupDockerConfig()` function calls `prepareDockerConfig()`. Pass the `forceDocker` option through:

```typescript
const dockerResult = await prepareDockerConfig(
  repoState.path,
  dockerDeps,
  onLoopEvent,
  { forceDocker: repoDeps.forceDocker }
)
```

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Agent Autonomy](../principles/agent-autonomy.md)
- [Batteries Included](../principles/batteries-included.md)

## Blocked By

(none)

## Definition of Done

- `dust bucket worker --docker` runs all repository agents inside Docker
- Uses bundled default Dockerfile when no custom config exists per-repo
- Custom `.dust/config/container/Dockerfile` in a repo takes precedence
- Unit tests verify flag propagation through bucket worker → repository loop
- Integration test confirms Docker mode activates across multiple repos

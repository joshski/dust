# Introduce ContainerRuntime Abstraction

Refactor the existing Docker code to use a `ContainerRuntime` interface, keeping Docker as the only implementation. This prepares the codebase for alternative container runtimes without adding new functionality.

## Background

The current Docker agent mode is implemented in `lib/docker/docker-agent.ts` with Docker-specific functions (`isDockerAvailable`, `buildDockerImage`, `prepareDockerConfig`). To support Apple Container as an alternative runtime, the code needs a provider-agnostic abstraction.

## Implementation

### Create ContainerRuntime interface

Add a new module `lib/container/runtime.ts` with a pure functional core:

```typescript
interface ContainerRuntime {
  name: 'docker' | 'apple-container'
  /** Check if the runtime CLI is available */
  isAvailable: (deps: ContainerDependencies) => Promise<boolean>
  /** Build an image from a Dockerfile */
  buildImage: (config: BuildConfig, deps: ContainerDependencies) => Promise<BuildResult>
  /** Get the CLI command for running containers */
  runCommand: string
  /** Map dust's run options to CLI arguments */
  buildRunArgs: (config: RunConfig) => string[]
}
```

### Refactor existing code

1. Move shared types and utilities from `lib/docker/docker-agent.ts` to `lib/container/`:
   - `ContainerDependencies` (renamed from `DockerDependencies`)
   - `BuildConfig`, `BuildResult`, `RunConfig` types
   - Image tag generation, Dockerfile detection

2. Create `lib/container/docker-runtime.ts` implementing `ContainerRuntime` for Docker

3. Update `lib/docker/docker-agent.ts` to use the new abstraction:
   - `prepareDockerConfig` becomes `prepareContainerConfig` accepting a runtime
   - Keep `prepareDockerConfig` as a thin wrapper for backward compatibility

4. Update callers (`lib/loop/loop.ts`, `lib/bucket/repository-loop.ts`) to pass the Docker runtime explicitly

### Keep imperative shell thin

The interface should be designed so container runtime selection is a pure function. The imperative shell (spawn calls, file system access) stays in the existing dependency injection pattern.

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Decoupled Code](../principles/decoupled-code.md)
- [Design for Testability](../principles/design-for-testability.md)

## Blocked By

(none)

## Definition of Done

- `ContainerRuntime` interface defined in `lib/container/runtime.ts`
- Docker implementation in `lib/container/docker-runtime.ts`
- Existing Docker functionality works unchanged
- Unit tests cover the new abstraction
- No changes to CLI flags or user-facing behavior

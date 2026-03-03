# Extract Docker setup to shared module

Docker setup logic is duplicated between `loop.ts` and `repository-loop.ts`. Both files contain nearly identical code for detecting, building, and configuring Docker images. Extract this to a shared function in `lib/docker/docker-agent.ts`.

## What to Change

Extract a `prepareDockerConfig` function that:

1. Checks for `.dust/Dockerfile` using `hasDockerfile()`
2. Generates image tag with `generateImageTag()`
3. Emits `loop.docker_detected` event via callback
4. Verifies Docker is available with `isDockerAvailable()`
5. Builds the Docker image with `buildDockerImage()`
6. Emits build status events via callback
7. Returns `{ config: DockerSpawnConfig }` on success, `{ error: string }` on failure, or `{}` if no Dockerfile exists

The callers (`loop.ts` and `repository-loop.ts`) will handle the result appropriately for their context:
- `loop.ts`: Print to stderr and return `{ exitCode: 1 }` on error
- `repository-loop.ts`: Log to buffer and return early on error

## Blocked By

(none)

## Principles

- [Reasonably DRY](../principles/reasonably-dry.md)
- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Decoupled Code](../principles/decoupled-code.md)

## Definition of Done

- [ ] `prepareDockerConfig` function exists in `lib/docker/docker-agent.ts`
- [ ] `loop.ts` uses `prepareDockerConfig` instead of inline Docker setup
- [ ] `repository-loop.ts` uses `prepareDockerConfig` instead of inline Docker setup
- [ ] Existing tests pass
- [ ] No duplicate Docker setup logic remains in the calling files

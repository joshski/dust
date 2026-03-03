# Extract Docker setup to shared module

Docker setup logic is duplicated between `loop.ts` and `repository-loop.ts`. Both files contain nearly identical code for detecting, building, and configuring Docker images.

## Current Duplication

Both files contain the same pattern:

1. Call `hasDockerfile()` to check for `.dust/Dockerfile`
2. Generate image tag with `generateImageTag()`
3. Emit `loop.docker_detected` event
4. Check `isDockerAvailable()`
5. Call `buildDockerImage()`
6. Handle success/failure with events
7. Build `DockerSpawnConfig` with `imageTag`, `repoPath`, `homeDir`, `hasGitconfig`
8. Check for `CLAUDE_CODE_OAUTH_TOKEN`

The code differs slightly:
- `loop.ts` returns early with `{ exitCode: 1 }` on failure
- `repository-loop.ts` logs to buffer and returns early

## Suggested Refactoring

Extract a `prepareDockerConfig` function in `lib/docker/docker-agent.ts`:

```typescript
interface DockerSetupResult {
  config?: DockerSpawnConfig
  error?: string
}

export async function prepareDockerConfig(
  repoPath: string,
  deps: DockerDependencies,
  onEvent: (event: LoopEvent) => void
): Promise<DockerSetupResult>
```

This function would:
1. Check for Dockerfile, return `{}` if not present
2. Verify Docker availability
3. Build the image
4. Return the config or error

Both callers would then handle the result appropriately for their context (exit code vs log buffer).

## Related

- `lib/cli/commands/loop.ts:539-593` - Docker setup in loop command
- `lib/bucket/repository-loop.ts:379-438` - Docker setup in repository loop
- `lib/docker/docker-agent.ts` - Existing Docker utilities
- [Reasonably DRY](../principles/reasonably-dry.md) - Extract only when duplication represents the same concept

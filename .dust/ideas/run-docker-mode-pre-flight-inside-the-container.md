# Run docker-mode pre-flight inside the container

When docker mode is enabled, the pre-flight phase (install and `dust check`) should execute inside the container. Today it runs on the host, making docker mode inconsistent.

## Context

The loop iteration (in `lib/loop/iteration.ts`) follows this sequence:

1. Git pull (host)
2. Check for available tasks (host)
3. Pre-flight: run install command + `dust check` (currently always host)
4. Invoke the agent (host or container depending on docker mode)

Step 3 is the inconsistency. `runPreflightChecks` uses a `ShellRunner` that always spawns host processes — even when `docker?: DockerSpawnConfig` is present in `IterationOptions`. As a result:

- **Host dependencies are required even in docker mode.** If the install command installs packages or tools only available inside the container, the host pre-flight will fail or produce different results.
- **Container-specific failures are invisible.** A broken container environment (missing runtime dependency, wrong Node version, broken install step) won't be caught until the agent actually runs.
- **The check environment differs from the coding environment.** `dust check` run on the host may pass while the same check inside the container would fail (or vice versa), giving false confidence.

The `DockerSpawnConfig` already carries everything needed to run a command inside the container: `imageTag`, `repoPath`, `homeDir`, `runCommand`, `gitProxyUrl`. The `ContainerRuntime` interface in `lib/container/runtime.ts` exposes `buildRunArgs(config: RunConfig)` which generates the full argument list for `docker run` or `container run`.

## Implementation Notes

`runOneIteration` (lines 332–502 in `lib/loop/iteration.ts`) currently selects its `ShellRunner` at line 405:

```ts
const shellRunner = loopDependencies.shellRunner ?? defaultShellRunner
```

The container-aware shell runner would be created here when `docker` and `containerRuntime` are both set in `options`. It wraps each command as:

```
<runCommand> run --rm -v <repoPath>:/workspace -w /workspace [envs] <imageTag> sh -c "<command>"
```

The repo is volume-mounted, so files written by the install step (e.g. `node_modules`) persist on the host filesystem and are visible to the subsequent `dust check` container invocation. Non-docker iterations remain unchanged.

`loop.ts` already holds `containerRuntime` (selected by `selectContainerRuntime`) alongside `dockerConfig` (lines 164, 229). Threading `containerRuntime` through `IterationOptions` mirrors how `docker` is already threaded there.

## Proposed Change

When `docker` and `containerRuntime` are set in `IterationOptions`, `runOneIteration` builds a container-aware `ShellRunner` using `containerRuntime.buildRunArgs` and the fields from `docker`. This runner is passed to `runPreflightChecks` in place of the host runner. Failure reporting and event emission remain the same — only the execution context changes.

## Open Questions

### Should `gitProxyUrl` be passed to container pre-flight?

#### Pass `gitProxyUrl` to the container shell runner

The git credential proxy is already started before iterations begin and is available in `docker.gitProxyUrl`. Pre-flight containers receive the same `GIT_PROXY_URL` environment variable as the agent container. This is consistent with the agent environment and supports private git dependencies during install (e.g. git URLs in `package.json`). The proxy is already running and the cost of passing it is low.

#### Omit `gitProxyUrl` from the container shell runner

Pre-flight containers use only `imageTag`, `repoPath`, and `homeDir`. Most package registries (npm, bun) don't use the git credential proxy, so this covers the common case with a simpler RunConfig. Private git package installs would fail — but that's an edge case and can be addressed later.

### Should `settings.dustCommand` be used as-is for container pre-flight?

#### Reuse `settings.dustCommand` unchanged

`runPreflightChecks` runs `` `${dustCommand} check` `` inside the container. `settings.dustCommand` is configured for the host (e.g. `bunx dust`, `npx @joshski/dust`, or a local `bin/dust`). Works correctly when the container Dockerfile installs dust under the same command as the host. No new configuration surface.

#### Add a `containerDustCommand` setting

Allows explicit control when the container and host use different dust invocations. Solves the problem cleanly when the Dockerfile installs dust differently from the host, but adds more configuration surface area.

#### Hard-code `dust check` for container pre-flight

Assumes `dust` is on `$PATH` inside the container. Avoids any setting but is the least flexible and could break when dust is only available as a local dependency.

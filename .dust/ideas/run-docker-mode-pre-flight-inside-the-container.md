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

## Proposed Change

When `docker` is set in `IterationOptions`, `runPreflightChecks` should use a container-aware shell runner instead of `defaultShellRunner`. This runner would wrap each command as a `docker run --rm` (or `container run --rm`) invocation using the same image and mounts as the agent, rather than spawning the command directly on the host.

The install command and `dust check` would both run inside the container. Failure reporting and event emission remain the same — only the execution context changes. Non-docker iterations continue using the current host `ShellRunner` unchanged.

## Open Questions

### How does `runOneIteration` access the `ContainerRuntime` to build the container shell runner?

`runOneIteration` receives `docker?: DockerSpawnConfig` via `IterationOptions`, but `ContainerRuntime` is selected in `loop.ts` and never threaded through. To call `runtime.buildRunArgs(config)` and obtain `runtime.runCommand`, the iteration code needs access to the runtime object.

#### Add `containerRuntime?: ContainerRuntime` to `IterationOptions`

`loop.ts` already holds `containerRuntime` alongside `dockerConfig` and passes both into `iterationOptions`. Inside `runOneIteration`, the runtime and docker config are used together to construct the container shell runner before calling `runPreflightChecks`. This mirrors how `docker` is already threaded through `IterationOptions` for the agent spawn path.

#### Add `containerRuntime?: ContainerRuntime` to `LoopDependencies`

The runtime is treated as a dependency like `spawn` or `run`, and injected via `LoopDependencies` rather than per-iteration options. This is a good fit if the runtime is considered a stable dependency for a loop session. However, `LoopDependencies` currently has no container-specific fields, and the runtime is only needed when `docker` is set — coupling all loop dependencies to container types may feel excessive.

#### Construct the container shell runner from `DockerSpawnConfig` alone, without `ContainerRuntime`

`DockerSpawnConfig` carries `runCommand` ('docker' or 'container'), `imageTag`, `repoPath`, and all mounts. A factory function could build the `ShellRunner` directly from this, branching on `runCommand` to produce the correct flags — avoiding the need to thread `ContainerRuntime` anywhere. The downside is replicating the arg-building logic already in `buildDockerRunArgs` / `buildAppleContainerRunArgs`.

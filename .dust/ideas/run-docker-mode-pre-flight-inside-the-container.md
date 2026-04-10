# Run docker-mode pre-flight inside the container

When docker mode is enabled, the pre-flight phase (install and `dust check`) should execute inside the same container environment used for the coding agent, not on the host.

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

### How should the container shell runner be constructed?

#### Inject a pre-built container ShellRunner into runPreflightChecks

`runOneIteration` detects docker mode and builds a container-aware `ShellRunner` before calling `runPreflightChecks`. The shell runner wraps each command in `docker run --rm` with the appropriate image, mounts, and working directory. `runPreflightChecks` stays agnostic — it receives a `ShellRunner` and doesn't know whether it's running on the host or in a container.

This keeps `runPreflightChecks` pure and makes it easy to test both paths independently.

#### Add a docker option to runPreflightChecks and let it branch internally

`runPreflightChecks` receives the `DockerSpawnConfig` alongside the `ShellRunner` and decides internally whether to use container execution. This co-locates the branching logic with the pre-flight logic but couples `runPreflightChecks` to container-specific types.

### Should the container shell runner reuse the full RunConfig (including credential mounts) or use a minimal subset?

#### Full RunConfig — same mounts as the agent invocation

The pre-flight container gets the same volume mounts, git proxy, and environment as the agent container. This maximises fidelity: if the agent can install and check, so can pre-flight. The downside is that pre-flight now depends on proxy servers being started before it runs, which is currently not the case (proxies are set up after `prepareContainerConfig` in `loop.ts` but before `runOneIteration`).

#### Minimal RunConfig — repo mount and working directory only, no credential mounts

Pre-flight uses a stripped-down run config: just the image, the repo mount, and the working directory. No git proxy, no Claude API proxy, no credential files. This is simpler and avoids the proxy dependency, but means the install command won't work if it needs network access through the proxy (e.g. `npm install` via a corporate registry reachable only through the git proxy).

### Where should the container shell runner live?

#### New module: lib/container/container-shell-runner.ts

A dedicated module creates a `ShellRunner` backed by the container runtime. The runner takes a `ContainerRuntime`, `DockerSpawnConfig`, and `spawn` function and produces a `ShellRunner`. This follows the existing pattern of thin adapters in `lib/container/`.

#### Inline in lib/loop/iteration.ts

The container shell runner is built inline inside `runOneIteration` without a new module. Simpler for now, but mixes container orchestration concerns into the iteration module.

### Should pre-flight failures in docker mode suggest container-specific troubleshooting?

#### Yes — actionable error messages distinguish host vs container failures

When pre-flight fails in docker mode, the error output includes a note that the failure occurred inside the container (e.g. "Install failed inside the Docker container"). This follows the [actionable-errors](../principles/actionable-errors.md) principle and helps users understand why the same command might behave differently than on the host.

#### No — the raw output is sufficient

The container's command output already contains the failure details. Adding extra framing risks being redundant or confusing. Users who understand docker mode will infer the context from the surrounding log output.

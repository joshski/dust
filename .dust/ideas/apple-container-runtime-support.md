# Apple Container runtime support

Support `--apple-container` as an alternative to `--docker` for running agent sessions in isolated containers on macOS.

## Motivation

Apple's [container](https://github.com/apple/container) project runs Linux containers as lightweight VMs natively on Apple Silicon (macOS 26+). It uses OCI-compatible images, so existing Dockerfiles work without modification.

Benefits over Docker on macOS:

- **No daemon required**: Each container launches as its own lightweight VM, no background service needed
- **No licensing concerns**: Open source, no commercial license restrictions (unlike Docker Desktop)
- **Native performance**: Built on Apple's Virtualization framework, optimized for Apple Silicon
- **Better isolation**: Per-container VMs rather than shared kernel in a single Docker VM

## Proposed direction

- Add `--apple-container` flag to `dust loop` (parallel to `--docker`)
- Reuse the same Dockerfile detection and build pipeline (`.dust/config/container/Dockerfile` or bundled default)
- Map `docker build`/`docker run` commands to `container build`/`container run` equivalents
- Proxy infrastructure (git credential proxy, Claude API proxy) should work unchanged since it communicates over HTTP

## Current implementation context

The Docker agent mode is already cleanly abstracted:

- **Dependency injection**: `DockerDependencies` in `lib/docker/docker-agent.ts` injects `spawn`, making it straightforward to swap the underlying CLI command
- **OCI compatibility**: Both runtimes use the same image format, so `prepareDockerConfig()` and Dockerfile detection can be shared
- **Ephemeral containers**: Current `docker run --rm` pattern maps naturally to Apple container's per-VM model

## What needs to be done

1. Verify `container build` and `container run` CLI equivalents accept the same flags dust currently passes to Docker (volume mounts, env vars, working directory, user, `--rm`)
2. Abstract the runtime selection behind the existing `DockerDependencies` interface (or a new `ContainerRuntime` interface)
3. Add `--apple-container` flag to `dust loop` CLI parsing
4. Add runtime auto-detection: prefer `container` on macOS 26+ Apple Silicon when available, with fallback to Docker
5. Test proxy infrastructure (git credentials, Claude API) works through Apple container networking

## Open Questions

### Should this be a separate flag or unified under `--container`?

#### Separate flags (`--docker` / `--apple-container`)

Explicit and clear. Users choose their runtime. No ambiguity.

#### Unified flag (`--container` with auto-detection)

Simpler UX. Auto-detect the best available runtime. Could add `--container-runtime=docker|apple` for explicit override.

### Should Apple container be preferred over Docker when both are available on macOS 26+?

#### Yes, prefer Apple container

Eliminates Docker Desktop dependency and licensing concerns. Lighter weight.

#### No, prefer Docker for consistency

Docker is the known quantity. Avoids surprises when switching between macOS and Linux.

#### Let the user choose via config

Add a `containerRuntime` setting in `.dust/config/settings.json` for persistent preference.

### How does this relate to the third-party sandbox provider idea?

#### Treat as another provider

Refactor Docker and Apple container into a common `ContainerRuntime` interface that could later accommodate cloud sandbox providers too.

#### Keep local runtimes separate from cloud providers

Local container runtimes (Docker, Apple container) have fundamentally different trade-offs from cloud sandboxes. Keep them as a distinct layer.

# Docker opt-in command line switch

Add a `--docker` flag to `dust loop` commands that enables Docker execution without a custom Dockerfile.

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

## Proposed behavior

Add a `--docker` flag that:

1. When passed, generates a default Dockerfile in memory (or temp location)
2. Builds and runs the agent in Docker using this generated config
3. Works even when no `.dust/config/container/Dockerfile` exists

The custom Dockerfile still takes precedence if present.

## Implementation notes

- Parse `--docker` flag in `lib/loop/parse-args.ts` alongside `maxIterations`
- Pass flag through to `runLoop()` via new option
- Modify `prepareDockerConfig()` to accept a `forceDocker` option
- Generate default Dockerfile content when force-enabled but no custom config exists
- The generated Dockerfile should match what will become the default (Bun base, agent CLIs, non-root user)

## Open Questions

### Should `--docker` work without any Dockerfile, or require one to exist?

#### Generate ephemeral default

The flag triggers Docker with a generated config. Lowest friction for trying Docker.

#### Require `.dust/config/container/Dockerfile` to exist

The flag just enables Docker; user must still provide config. More explicit but higher friction.

### What should the generated default Dockerfile contain?

#### Bun-based with Claude and Codex

Use `oven/bun:1` base with both agent CLIs installed. Covers most dust use cases.

#### Node-based with Claude and Codex

Use official Node image. More conservative and widely compatible.

#### Configurable base image

Allow `--docker=node:20` or similar. Maximum flexibility but more complex UX.

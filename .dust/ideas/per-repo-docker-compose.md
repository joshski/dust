# Per-repo docker compose

Start a repository-specific docker compose environment for each `dust bucket worker` or `dust loop` iteration, with named projects for isolation.

## Motivation

Many repositories require supporting services (databases, message queues, caches, etc.) to run tests or develop features. When running `dust bucket` or `dust loop`:

- **Service dependencies**: A task might require PostgreSQL, Redis, or other services to run the test suite or development server
- **Project isolation**: Multiple repositories running concurrently should not share or collide on ports, volumes, or container names
- **Reproducibility**: Starting fresh services per iteration ensures a clean environment, matching the isolation goals of the existing docker loop ideas

This complements the existing `dust-loop-docker.md` idea (running the agent itself in docker) and `expand-dust-loop-to-support-third-party-sandbox-providers.md` (cloud sandboxes). Those focus on isolating the agent process; this idea focuses on isolating the services the agent's code depends on.

## Context

The `dust bucket` command (`lib/cli/commands/bucket.ts`) manages multiple repositories concurrently via WebSocket connection to dustbucket. Each repository gets cloned to `~/.dust/repos/` and runs in its own `runRepositoryLoop` (`lib/bucket/repository-loop.ts`).

The `dust loop` command (`lib/cli/commands/loop.ts`) runs a single repository in a continuous loop, executing `runOneIteration` which:
1. Syncs with remote (git pull)
2. Finds available tasks
3. Spawns an agent to work on the task
4. Repeats

Neither command currently has awareness of docker compose files or service dependencies.

## Possible implementation

1. Before starting an iteration, detect if a `docker-compose.yml` (or `compose.yml`, `compose.yaml`) exists in the repository root
2. If present, run `docker compose up -d` with a project name derived from the repository (e.g., `dust-<repo-name>` or `dust-<repo-name>-<iteration-id>`)
3. After the iteration completes, run `docker compose down` to clean up services
4. The project name isolation ensures multiple repositories don't conflict on container names or ports

## Open Questions

### When should services start and stop?

#### Per-iteration lifecycle

Start services before each agent session, stop after it completes. Maximum isolation but adds startup latency to every iteration. Makes sense if iterations are long-running or services have mutable state that could leak between iterations.

#### Per-repository lifecycle (in bucket mode)

Start services when a repository is first cloned, keep running while the repository loop is active, stop when the repository is removed. Faster iteration startup but services persist across iterations. Works well for stateless services or when iterations need consistent state.

### How should the project name be derived?

#### Repository name only

Use `dust-<repo-name>` as the docker compose project name. Simple, but could conflict if the same repository is being run by multiple independent dust processes.

#### Repository name plus unique suffix

Use `dust-<repo-name>-<uuid>` or include the session ID. Guarantees isolation even when running the same repo multiple times, but may leave orphaned resources if cleanup fails.

### Should services be started unconditionally or only when detected as needed?

#### Always start if compose file exists

If a compose file is present, always bring up services. Simple rule, easy to understand. May start unnecessary services for some tasks.

#### Detect dependencies from task context

Analyze the task or run a probe command to determine if services are actually needed. Avoids unnecessary overhead but adds complexity and may miss edge cases.

### How should compose file variants be handled?

#### Use repository's default compose file

Honor whatever `docker-compose.yml` or `compose.yml` the repository provides. Respects project conventions but may not be suitable for CI/agent execution (e.g., may include dev UI services).

#### Support a dust-specific compose file

Look for `.dust/compose.yml` or similar, falling back to the default. Lets projects define an agent-optimized service set. Adds configuration surface but provides control.

### Should exposed ports be randomized or use compose defaults?

#### Use compose defaults

Trust the compose file to define ports. Simple, but may conflict if multiple repos use the same port (e.g., both use 5432 for Postgres).

#### Randomize ports and inject via environment

Override exposed ports with random available ports and set environment variables for the agent to discover them. Avoids conflicts but requires applications to read ports from environment variables.

# Support Docker Compose

Extend the Docker agent mode to support `docker compose` for applications that need a whole set of interconnected services for development.

## Motivation

The current Docker agent mode (`.dust/Dockerfile`) works well for single-container environments. However, many real-world applications require multiple services running together:

- Web application + database + cache (e.g., Node.js + PostgreSQL + Redis)
- Microservices architectures with multiple interdependent services
- Applications requiring message queues, search engines, or other infrastructure
- Development environments mirroring production multi-service topologies

Docker Compose is the standard solution for orchestrating multi-container development environments. Supporting it would make dust viable for more complex projects.

## Proposed Design

Add support for a `docker-compose.yml` file at `.dust/config/container/docker-compose.yml`. When present, dust would:

1. Run `docker compose up -d` to start the service stack
2. Execute agent sessions inside the designated "agent" service container
3. Keep services running across iterations (unlike the current per-iteration container model)
4. Shut down services with `docker compose down` when the loop ends

### Example Configuration

```yaml
# .dust/config/container/docker-compose.yml
version: '3.8'
services:
  agent:
    build:
      context: ../..
      dockerfile: .dust/config/container/Dockerfile
    volumes:
      - .:/workspace
    working_dir: /workspace
    depends_on:
      - db
      - redis
    environment:
      - DATABASE_URL=postgres://postgres:postgres@db:5432/app
      - REDIS_URL=redis://redis:6379
  db:
    image: postgres:15
    environment:
      - POSTGRES_PASSWORD=postgres
  redis:
    image: redis:7
```

### Detection and Precedence

When determining how to run agents, dust would check in order:

1. `.dust/config/container/docker-compose.yml` - use docker compose mode
2. `.dust/Dockerfile` - use current single-container Docker mode
3. Neither present - run directly on host

## Implementation Considerations

### Service Lifecycle

Unlike the current model where each Docker container is ephemeral per iteration, compose services would persist across iterations. This means:

- Database state survives between agent sessions (useful for incremental changes)
- Faster iteration times (no cold-start penalty for dependent services)
- Need to consider when/how to reset state if needed

### Agent Container Identification

The compose file needs a way to identify which service is the "agent" container where Claude runs. Options include:

- Convention: service named `agent` or `dust-agent`
- Configuration: add `agentService` to settings.json
- Label: `dust.agent=true` label on the service

### Volume Mounts and Working Directory

The agent service must mount the repository and set the working directory correctly. The compose file author is responsible for this, but dust could validate the configuration.

### Environment Variables

Environment variables like `CLAUDE_CODE_OAUTH_TOKEN` need to be passed to the agent service. This could be done via:

- `.env` file in the compose directory
- Direct injection by dust when running docker compose commands
- A combination where dust-specific vars are injected and project vars come from `.env`

## Related Work

- [Docker Agent Mode](../facts/docker-agent-mode.md) - current single-container implementation
- [Complete Docker Proxy Isolation](./complete-docker-proxy-isolation.md) - security architecture that would apply to compose mode
- [Expand dust loop to support third-party sandbox providers](./expand-dust-loop-to-support-third-party-sandbox-providers.md) - broader sandboxing strategy

## Open Questions

### Should services persist across iterations or be recreated each time?

#### Persistent services (recommended)

Keep services running across iterations. This is more efficient and matches typical docker compose usage. Agents would reconnect to existing services each iteration.

#### Ephemeral services

Run `docker compose up` and `docker compose down` around each iteration. Guarantees clean state but adds significant overhead and cold-start latency.

### How should the agent service be identified in the compose file?

#### Convention-based naming

Require the agent service to be named `agent` or `dust-agent`. Simple and requires no additional configuration.

#### Explicit configuration in settings.json

Add an `agentService` key to `.dust/config/settings.json` specifying the service name. More flexible but adds configuration burden.

#### Service label

Use a Docker label like `dust.agent=true` on the service definition. Keeps the configuration self-contained in the compose file.

### Should dust validate the compose configuration?

#### Yes, validate critical requirements

Check that the agent service exists, has correct volume mounts, and working directory. Prevents confusing errors at runtime.

#### No, trust the user's compose file

Let docker compose validate the configuration. Keeps dust simple and avoids duplicating docker compose's validation logic.

### What happens if docker compose up fails?

#### Fail fast with clear error

Exit immediately with the compose error output. Simple and gives the user all the information to debug.

#### Retry with backoff

Attempt to start services a few times before failing. Could help with transient issues but may hide real problems.

### Should there be a way to reset service state between iterations?

#### No built-in reset mechanism

Users can manually run `docker compose down -v` or include cleanup in their workflow. Keeps dust simple.

#### Add a --reset flag

Provide `dust loop --reset` or similar that runs `docker compose down -v && docker compose up -d` before the first iteration.

#### Support a reset hook

Allow a `resetCommand` in settings.json that dust runs between iterations if specified (e.g., database migrations, cache clearing).

# Generate Dockerfile from GitHub Actions Workflows

Automatically generate a Docker agent container Dockerfile by parsing a project's existing GitHub Actions workflow files.

## Motivation

The current Docker agent mode requires either using a generic Node.js-focused default Dockerfile or writing a custom one from scratch. Neither is ideal for arbitrary tech stacks:

- The default Dockerfile assumes Node.js and won't work for Python, Go, Rust, etc.
- Writing a custom Dockerfile is a barrier to adoption — users must figure out what their agent container needs
- Auto-detecting from `package.json` / `requirements.txt` / `go.mod` is fragile and heuristic-heavy

Most projects already have GitHub Actions workflows that declare exactly what's needed to build and test. These are tested, working declarations of the project's CI environment — effectively a solved version of the detection problem.

## Proposed Design

When a project has no custom Dockerfile at `.dust/config/container/Dockerfile` and `--docker` mode is requested, dust would:

1. Look for `.github/workflows/*.yml` files
2. Parse the workflow(s) to extract environment requirements
3. Generate a Dockerfile and write it to `.dust/config/container/Dockerfile` for the developer to review and commit

### What to Extract from Workflows

**Runtime versions** from `actions/setup-*` steps:
- `actions/setup-node@v4` with `node-version: 20` → install Node.js 20
- `actions/setup-python@v5` with `python-version: '3.12'` → install Python 3.12
- `actions/setup-go@v5` with `go-version: '1.22'` → install Go 1.22
- `actions/setup-java@v4` with `java-version: '21'` → install Java 21

**Service containers** from the `services:` block:
- `postgres:15` → install or embed PostgreSQL 15
- `redis:7` → install Redis 7
- Other databases, caches, message queues

**System dependencies** from `run:` steps:
- `apt-get install` commands
- `brew install` commands
- Other system-level package installations

**Environment variables** from `env:` blocks:
- Database connection strings
- Service URLs
- Feature flags relevant to testing

### Example

Given this workflow:

```yaml
name: CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install -r requirements.txt
      - run: pytest
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/postgres
```

Dust would generate:

```dockerfile
FROM ubuntu:22.04
RUN apt-get update && apt-get install -y git curl
# Python 3.12 (from actions/setup-python)
RUN apt-get install -y python3.12 python3-pip
# PostgreSQL 15 (from services.postgres)
RUN apt-get install -y postgresql-15
# AI coding tools
RUN npm install -g @anthropic-ai/claude-code
ENV DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres
RUN useradd -m -s /bin/bash user
USER user
WORKDIR /workspace
```

## Implementation Considerations

### Which workflow/job to use

Projects often have multiple workflows (lint, test, deploy, release). The generator should:

- Prefer workflows triggered by `push` or `pull_request` (these are typically the test workflows)
- Look for jobs that run test commands (`npm test`, `pytest`, `go test`, `cargo test`, etc.)
- Merge requirements from multiple relevant jobs rather than picking just one

### Generated, not magic

The generated Dockerfile should be written to `.dust/config/container/Dockerfile` for the developer to review and tweak, not used silently. This keeps the developer in control and handles edge cases the generator can't anticipate.

### Service containers as installed packages vs. sidecars

GitHub Actions runs service containers as separate Docker containers. In a single-container agent model, these services need to be installed directly in the image and started via an entrypoint script. This is a reasonable trade-off for common services (Postgres, Redis, MySQL) but won't work for everything.

### Handling custom/composite actions

Some workflows use opaque composite actions or reusable workflows that are harder to parse. The generator should handle the common `actions/setup-*` patterns and gracefully skip what it doesn't recognize, leaving TODO comments in the generated Dockerfile.

### Matrix builds

Workflows using `strategy.matrix` define multiple versions. The generator should pick the latest or most common version rather than trying to install all of them.

## Related Work

- [Docker Agent Mode](../facts/docker-agent-mode.md) - current single-container implementation
- [Support Docker Compose](./support-docker-compose.md) - alternative approach for multi-service environments
- [Expand dust loop to support third-party sandbox providers](./expand-dust-loop-to-support-third-party-sandbox-providers.md) - broader sandboxing strategy

## Open Questions

### Should this be a one-time generation or kept in sync?

#### One-time generation (recommended)

Generate once, developer owns the file from then on. Simple and predictable. The workflow may change over time but the Dockerfile is a starting point, not a live mirror.

#### Re-generate on workflow changes

Detect when workflows change and offer to regenerate. More helpful but risks overwriting developer customizations.

### Should the generator be an interactive command?

#### Yes, a dedicated command like `dust docker init`

Lets the developer explicitly trigger generation, review the output, and iterate. Clearer mental model.

#### No, just suggest it automatically

When `--docker` is used with no custom Dockerfile, detect workflows and suggest generation. Lower friction but potentially surprising.

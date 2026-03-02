# Run Agent in Per-repo Docker Container

When `.dust/Dockerfile` exists, `dust loop claude` should build a Docker image and run the agent inside a container.

## Context

Currently, `dust loop claude` spawns the `claude` command directly on the host machine via `spawnClaudeCode()` in `lib/claude/spawn-claude-code.ts`. This works but provides no isolation - agents can access the entire host filesystem and network.

Per-repo Dockerfiles let each project define its ideal agent environment (specific runtimes, dependencies, tools) while providing sandboxing.

## Design Decisions

These decisions were made during idea decomposition:

- **Dockerfile location:** `.dust/Dockerfile`
- **Credentials:** Mount host credential directories (`~/.claude/`, `~/.ssh/`, `~/.gitconfig`) as read-only volumes
- **No fallback:** If no `.dust/Dockerfile` exists, behavior is unchanged (spawn directly on host)

## Implementation

1. At `dust loop` startup, check if `.dust/Dockerfile` exists in the repository
2. If present, build the image with a deterministic tag (e.g., `dust-agent-<repo-name>`)
3. When spawning the agent, use `docker run` instead of calling `claude` directly:
   - Mount the repository directory into the container (e.g., `-v /path/to/repo:/workspace`)
   - Mount credential directories read-only:
     - `-v ~/.claude:/root/.claude:ro`
     - `-v ~/.ssh:/root/.ssh:ro`
     - `-v ~/.gitconfig:/root/.gitconfig:ro` (if exists)
   - Set working directory to `/workspace`
   - Pass through environment variables
   - Forward stdio for streaming JSON output

The spawn abstraction in `spawnClaudeCode()` should make this relatively clean - the function already takes a `dependencies.spawn` parameter that can be modified or wrapped.

## Out of Scope

- `dust bucket` Docker support (that's a separate task - it has additional complexity around managing multiple repos)
- Docker Compose for service dependencies (descoped in the original idea)
- Base image fallback (decision: require explicit Dockerfile)

## Principles

- [Agent Autonomy](../principles/agent-autonomy.md)
- [Easy Adoption](../principles/easy-adoption.md)
- [Actionable Errors](../principles/actionable-errors.md)

## Blocked By

(none)

## Definition of Done

- [ ] `dust loop claude` detects `.dust/Dockerfile` at startup
- [ ] Docker image is built (or cached) with a deterministic tag
- [ ] Agent runs inside the container with the repo mounted at `/workspace`
- [ ] Host credential directories are mounted read-only
- [ ] Agent can successfully complete a task (git operations, file edits, etc.)
- [ ] When no `.dust/Dockerfile` exists, behavior is unchanged (spawns directly)
- [ ] Error messages are actionable (e.g., "Docker not installed", "Dockerfile build failed")
- [ ] All tests pass
- [ ] `bin/dust check` passes

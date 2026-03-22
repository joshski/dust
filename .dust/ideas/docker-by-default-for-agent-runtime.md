# Docker by default for agent runtime

Make Docker the default execution mode for Dust agents so end users do not need to supply a custom Dockerfile just to get started.

The Docker configuration contract is now resolved: `.dust/config/container/Dockerfile` is the canonical path. Remaining work focuses on making Docker the default runtime with provider-aware handling and safe fallback behavior.

## Why this matters

- Reduces setup friction for new users
- Improves runtime isolation by default
- Lowers support burden from host-environment drift
- Preserves advanced flexibility through explicit custom overrides

## Proposed direction

- Default to Docker runtime in `auto` mode
- Generate a reasonable container recipe when no custom container config exists
- Keep an explicit custom override path for advanced users
- Make Docker setup provider-aware (Claude and Codex), including auth and proxy behavior
- Add clear fallback and diagnostics when Docker is unavailable

## Current implementation context

The Docker agent mode infrastructure is already in place:

- **Detection**: `prepareDockerConfig()` in `lib/docker/docker-agent.ts` checks for `.dust/config/container/Dockerfile`
- **Provider support**: Both Claude (`lib/claude/spawn-claude-code.ts`) and Codex (`lib/codex/spawn-codex.ts`) have Docker execution paths
- **Proxy infrastructure**: Git credential proxy and Claude API proxy handle authentication in Docker containers
- **Loop integration**: `runLoop()` in `lib/loop/loop.ts` orchestrates Docker detection, proxy setup, and cleanup

The current behavior is opt-in: Docker mode only activates when `.dust/config/container/Dockerfile` exists. To make Docker the default, we need to:

1. Generate a default Dockerfile when none exists
2. Decide on fallback behavior when Docker is unavailable
3. Add a way to opt out of Docker for users who prefer host execution

## Current status (2026-03-22)

- Smallest Codex support step is now covered in end-to-end testing:
  - Docker E2E run includes both `claude` and `codex` providers in the same workflow.
  - Docker custom file path coverage is aligned to `.dust/config/container/Dockerfile`.
- The `--docker` opt-in switch is now implemented for `dust loop`.
- This does not yet make Docker the default runtime; it only reduces rollout risk by validating multi-provider behavior.

## What needs to be done

1. ~~Resolve and document the Docker configuration contract (legacy `.dust/Dockerfile` vs `.dust/config/*`).~~ Done: The canonical contract is `.dust/config/container/Dockerfile`. The legacy `.dust/Dockerfile` path is rejected by both `dust lint` and runtime with migration instructions.
2. ~~Add provider-aware Docker execution support for both Claude and Codex paths.~~ Done: Both providers have working Docker execution paths with proper authentication handling.
3. ~~Add a `--docker` opt-in switch for `dust loop` commands.~~ Done: `dust loop --docker` uses the bundled default Dockerfile at `lib/docker/default.Dockerfile` when no custom Dockerfile exists.
4. Introduce generated default container configuration for common repositories.
5. Add migration guidance and compatibility behavior for early adopters.
6. Expand end-to-end coverage to validate Docker-default behavior across providers.
   Minimal first step is complete (Codex + Claude coverage added); Docker-by-default behavior still needs dedicated coverage.

## Open Questions

### Should Docker default be hard default or auto-with-fallback?

#### Hard default

Strong isolation guarantee, but fails fast on hosts without Docker.

#### Auto-with-fallback

Best adoption path. Use Docker when available, otherwise run on host with a visible warning.

### How should generated container recipes be surfaced?

#### Ephemeral generated config

No repo churn and easiest onboarding, but less transparent.

#### Materialized generated file checked into repo

More explicit and reviewable, but adds maintenance overhead.

### How should users opt out of Docker-by-default?

#### `--no-docker` command line flag

Explicit opt-out per invocation. Simple and consistent with other CLI patterns.

#### Configuration in `.dust/config/settings.json`

Persistent opt-out at the repository level. Reduces repetition for projects that need host execution.

#### Both

Offer both: config file for persistent preference, flag for per-invocation override. More flexible but adds complexity.

### What should the default Dockerfile include?

#### Minimal base with agent CLIs only

Just Bun/Node + Claude Code + Codex. Users add project-specific dependencies via custom Dockerfile.

#### Language-aware base images

Detect project type (Node, Python, etc.) and use appropriate base. More batteries-included but more magic.

#### Standard multi-purpose image

A single well-maintained image with common languages/tools. Larger but predictable.

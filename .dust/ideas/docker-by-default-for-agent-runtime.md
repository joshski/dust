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

## Current status (2026-03-21)

- Smallest Codex support step is now covered in end-to-end testing:
  - Docker E2E run includes both `claude` and `codex` providers in the same workflow.
  - Docker custom file path coverage is aligned to `.dust/config/container/Dockerfile`.
- This does not yet make Docker the default runtime; it only reduces rollout risk by validating multi-provider behavior.

## What needs to be done

1. ~~Resolve and document the Docker configuration contract (legacy `.dust/Dockerfile` vs `.dust/config/*`).~~ Done: The canonical contract is `.dust/config/container/Dockerfile`. The legacy `.dust/Dockerfile` path is rejected by both `dust lint` and runtime with migration instructions.
2. Add provider-aware Docker execution support for both Claude and Codex paths.
3. Introduce generated default container configuration for common repositories.
4. Add migration guidance and compatibility behavior for early adopters.
5. Expand end-to-end coverage to validate Docker-default behavior across providers.
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

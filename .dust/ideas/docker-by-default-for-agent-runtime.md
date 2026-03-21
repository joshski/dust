# Docker by default for agent runtime

Make Docker the default execution mode for Dust agents so end users do not need to supply a custom Dockerfile just to get started.

Today, Docker behavior is still split across provider paths and contract conventions. We should converge on one configuration contract under `.dust/config/`, make provider handling explicit (Claude and Codex), and provide safe fallback behavior.

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

## What needs to be done

1. Resolve and document the Docker configuration contract (legacy `.dust/Dockerfile` vs `.dust/config/*`).
2. Add provider-aware Docker execution support for both Claude and Codex paths.
3. Introduce generated default container configuration for common repositories.
4. Add migration guidance and compatibility behavior for early adopters.
5. Expand end-to-end coverage to validate Docker-default behavior across providers.

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

### How much backward compatibility do we keep for `.dust/Dockerfile`?

#### No compatibility (breaking)

Simplifies implementation and messaging if usage is effectively zero.

#### Temporary compatibility shim

Safer rollout, but prolongs dual-path complexity.

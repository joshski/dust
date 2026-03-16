# Productionize OAuth gateway sidecar for general Docker workflows

Expose `apiKeyHelper` plus a host OAuth gateway as a first-class Dust feature.
This enables containerized Claude agents without placing `CLAUDE_CODE_OAUTH_TOKEN` inside containers.

The architecture is already validated:
- Dust Docker mode now routes Claude traffic through a host proxy and avoids passing OAuth tokens into container env.
- End-to-end coverage verifies healthy proxy auth behavior (`200` responses and no `401`).
- POC scripts in dustbucket validate `apiKeyHelper`-driven sidecar token flow for broader container setups.

## Remaining Work Before General Availability

### 1. Productize configuration and UX

- Add explicit Dust config for gateway mode (`enabled`, bind strategy, token mode, policy profile).
- Provide low-friction defaults compatible with existing user Dockerfiles.
- Standardize local auth helper wiring so users do not need custom scripts.

### 2. Harden helper token lifecycle

- Replace static helper token behavior with short-lived, scoped, revocable tokens.
- Bind helper tokens to repository/session/process identity where possible.
- Add replay resistance (single-use or monotonic nonce windows).

### 3. Enforce stricter gateway policy

- Restrict gateway exposure to loopback/host-local channels (or Unix socket on supported platforms).
- Enforce upstream allowlists (host + path + method).
- Add request/response size and rate limits to reduce abuse/exfiltration blast radius.

### 4. Improve auditability and ops behavior

- Emit structured gateway events (token issued/validated/rejected, upstream status classes, policy denials).
- Redact secrets and sensitive payload fragments in all logs.
- Add health checks and deterministic failure messages for local debugging and CI.

### 5. Expand test coverage for security and portability

- Add adversarial tests (replay, token leakage attempts, direct upstream bypass attempts).
- Add platform coverage for Docker Desktop and Linux host networking differences.
- Add end-to-end tests for failure modes (gateway down, expired token, policy violation).

### 6. Define rollout and compatibility plan

- Introduce behind a feature flag with compatibility fallback.
- Document migration path from direct token-in-container setups.
- Define support boundaries for unattended mode vs interactive/local mode.

## Open Questions

### Should the first GA target be only Dust-managed Docker mode or all arbitrary container workflows?

#### Dust-managed Docker mode first

Smaller blast radius and clearer support model; fastest path to a secure default.

#### Arbitrary workflows from day one

Higher user reach, but larger surface area and higher support burden.

### What should be the default helper token policy at launch?

#### Short TTL scoped token

Easier to implement and operate, with meaningful risk reduction over static secret injection.

#### Single-use token

Stronger replay resistance, but additional coordination complexity and potential reliability cost.

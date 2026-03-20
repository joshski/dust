# Productionize OAuth gateway sidecar for general Docker workflows

Expose `apiKeyHelper` plus a host OAuth gateway as a first-class Dust feature.
This enables containerized Claude agents without placing `CLAUDE_CODE_OAUTH_TOKEN` inside containers.

The architecture is already validated:
- Dust Docker mode now routes Claude traffic through a host proxy (`lib/proxy/claude-api-proxy.ts`) and avoids passing OAuth tokens into container env.
- The proxy reads OAuth tokens from host credentials (`~/.claude/.credentials.json`) or `CLAUDE_CODE_OAUTH_TOKEN` and injects them upstream.
- End-to-end coverage verifies healthy proxy auth behavior (`200` responses and no `401`).
- POC scripts in dustbucket (`scripts/end-to-end/claude-oauth-apikey-helper-poc.ts`) validate `apiKeyHelper`-driven sidecar token flow for broader container setups.

## Current Implementation Status

### Already implemented

- **Claude API proxy**: `lib/proxy/claude-api-proxy.ts` proxies requests from Docker containers to `api.anthropic.com`, injecting OAuth tokens on the host side.
- **Git credential proxy**: `lib/proxy/git-credential-proxy.ts` proxies git operations, using host-side `git credential fill` to inject auth.
- **Docker spawn with apiKeyHelper**: `lib/claude/spawn-claude-code.ts` configures Docker containers with `ANTHROPIC_BASE_URL` pointing to the proxy and mounts a settings file with `apiKeyHelper` configured to fetch helper tokens from the proxy's `/token` endpoint. No OAuth tokens or dummy auth tokens are passed to containers.
- **Helper token module**: `lib/proxy/helper-token.ts` provides pure functions for generating and validating short-TTL helper tokens with 60-second expiry.
- **Token endpoint**: The Claude API proxy exposes `/token` for containers to fetch helper tokens.
- **No credential mount when proxied**: When `claudeApiProxyUrl` is set, `~/.claude` and `~/.claude.json` are NOT mounted into containers.

### Not yet implemented

- Explicit Dust config for gateway mode in `.dust/config/settings.json`.
- Upstream allowlists and rate limits.
- Structured gateway events and audit logging.
- Unix socket support (currently TCP only).

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

## Resolved Questions

### Should the first GA target be only Dust-managed Docker mode or all arbitrary container workflows?

**Decision:** Dust-managed Docker mode first — smaller blast radius and clearer support model; fastest path to a secure default.

### What should be the default helper token policy at launch?

**Decision:** Short TTL scoped token — easier to implement and operate, with meaningful risk reduction over static secret injection.

## Open Questions

### Where should gateway configuration live?

#### In `.dust/config/settings.json`

Keeps all Dust configuration in one place. Consistent with existing `checks`, `dustCommand`, and other settings.

#### In a dedicated `.dust/config/gateway.json`

Separates security-sensitive configuration from general settings. Allows finer-grained file permissions or gitignore patterns.

### How should the gateway bind address be configured?

#### Automatic port selection (current behavior)

The proxy binds to `127.0.0.1:0` and gets an ephemeral port. Simple and avoids port conflicts, but requires dynamic configuration of `ANTHROPIC_BASE_URL`.

#### Fixed well-known port

Use a consistent port like `127.0.0.1:3002` for predictability. Easier to document and debug, but may conflict with other services.

#### Unix socket on supported platforms

Use `/tmp/dust-gateway.sock` or similar for stronger isolation (no network exposure). Better security posture but more complex cross-platform support.

### Should upstream requests be restricted to an allowlist?

#### Yes, strict allowlist

Only allow requests to known Anthropic API paths (`/v1/messages`, `/v1/complete`, etc.). Reduces risk if a compromised agent tries to use the gateway as a general proxy.

#### No, pass through all requests

Trust that the gateway is only reachable from local containers. Simpler implementation and avoids maintenance burden of updating allowlists when APIs change.

### How should the gateway handle OAuth token refresh?

#### Proxy handles refresh transparently

When the access token is near expiry, the proxy uses the refresh token to obtain a new access token before forwarding requests. Seamless for the container but adds complexity to the proxy.

#### Fail and let Claude Code retry

Return 401 when the token expires. Claude Code's built-in retry logic will re-invoke `apiKeyHelper` to get a fresh token. Simpler proxy, but adds latency on refresh.

### Should gateway events be sent to dustbucket?

#### Yes, include gateway events in bucket event stream

Enables centralized monitoring and debugging for fleet deployments. Aligns with existing event transport for command events.

#### No, keep gateway events local only

Reduces data sent to external services. Simpler privacy model. Local logs are sufficient for single-machine debugging.

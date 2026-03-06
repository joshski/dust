# Harden Docker Proxy Isolation

Finish the remaining security hardening work for proxy-based unattended sessions after introducing the local bucket proxy surface.

## Current State

The local proxy flow is now split into focused tasks:

- [Route Bucket Tool Execution Through Local Proxy](../tasks/route-bucket-tool-execution-through-local-proxy.md)
- [Expose Bucket Tool Definitions via Local Proxy and Remove Legacy Paths](../tasks/expose-bucket-tool-definitions-via-local-proxy-and-remove-legacy-paths.md)

These tasks cover event and tool routing, but broader isolation gaps remain for Docker-based unattended agents.

## Remaining Scope

1. Prevent non-proxied outbound traffic from Docker agent containers by default.
2. Remove or minimize direct secret pass-through that is still required in some modes (for example `OPENAI_API_KEY`).
3. Define an explicit host allowlist/audit policy for proxy-mediated HTTP requests.
4. Add operational diagnostics for proxy lifecycle failures (start, bind, and shutdown behavior).

## Open Questions

### Should Docker proxy isolation be mandatory or opt-in?

#### Mandatory in unattended mode

Safer default and lower risk of accidental secret exposure.

#### Opt-in with warnings

Easier rollout and fewer breaking changes for existing users.

### How should non-proxy network egress be controlled?

#### Container-level network restrictions

Block everything except local proxy endpoints for strong technical enforcement.

#### Proxy policy only

Keep networking unchanged and enforce policy in proxy handlers for simpler deployment.

### How should remaining secret dependencies be handled?

#### Keep pass-through for compatibility

Preserve current behavior and iterate gradually toward full proxy mediation.

#### Require proxy-backed auth flows

Disallow direct secret pass-through in unattended mode and fail fast when unavailable.

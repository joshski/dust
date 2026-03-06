# Complete Docker Proxy Isolation

Continue hardening unattended Docker sessions now that local proxy routing for events and tool execution is in place.

## Current State

- Completed: route `dust bucket tool` execution through the local bucket proxy.
- Pending task: [Expose Bucket Tool Definitions via Local Proxy and Remove Legacy Paths](../tasks/expose-bucket-tool-definitions-via-local-proxy-and-remove-legacy-paths.md)

## Remaining Scope

1. Prevent non-proxied outbound traffic from Docker agent containers by default.
2. Remove or minimize direct secret pass-through still needed in some modes (for example `OPENAI_API_KEY`).
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

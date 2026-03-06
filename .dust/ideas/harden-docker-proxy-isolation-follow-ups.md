# Harden Docker Proxy Isolation Follow-Ups

Continue unattended Docker hardening now that tool definitions and command events are proxy-first.

## Remaining Scope

1. Prevent non-proxied outbound traffic from Docker agent containers by default.
2. Remove or minimize direct secret pass-through still needed in some modes (for example `OPENAI_API_KEY`).
3. Define an explicit host allowlist and audit policy for proxy-mediated HTTP requests.
4. Add operational diagnostics for proxy lifecycle failures (start, bind, and shutdown behavior).

## Open Questions

### Should Docker proxy isolation be mandatory or opt-in?

#### Mandatory in unattended mode

Safer default and lower risk of accidental secret exposure.

#### Opt-in with warnings

Easier rollout and fewer breaking changes for existing users.

### How should non-proxy network egress be controlled?

#### Container-level network restrictions

Block everything except local proxy endpoints for stronger enforcement.

#### Proxy policy only

Keep networking unchanged and enforce policy in proxy handlers for simpler deployment.

# Agent secrets via OAuth gateway and apiKeyHelper

Add a first-class pattern in Dust for running Claude Code in containers without putting `CLAUDE_CODE_OAUTH_TOKEN` in container environment variables.

The validated shape is:
- A host-side gateway holds the real OAuth token (from host auth/keychain context).
- Containerized Claude uses `apiKeyHelper` to fetch a synthetic helper token from localhost.
- Claude requests are sent through the gateway (`ANTHROPIC_BASE_URL`), and the gateway injects the real OAuth token upstream.

This would make secure-by-default container auth practical for teams using existing Dockerfiles, while reducing token exfiltration risk from container runtime state.

## Open Questions

### Should Dust ship this as built-in gateway functionality?

#### Yes, built into Dust loop/runtime

Consistent UX and fewer setup mistakes, but expands maintenance surface in core Dust.

#### No, documented external helper pattern

Smaller core scope, but users must assemble pieces manually and may diverge on security details.

### How should helper tokens be constrained?

#### Very short TTL reusable token

Simple operational model and low overhead, with acceptable risk when bound to loopback and strict expiry.

#### Single-use token per request

Tighter replay resistance, but more complexity and more moving parts between helper and proxy.

### What should the first user-facing integration target be?

#### `dust loop claude` container flow

Targets the highest-friction path for looping users and aligns with existing “claude loops and 401s” pain.

#### General CLI auth-proxy utility

More reusable across commands, but larger scope for first rollout.

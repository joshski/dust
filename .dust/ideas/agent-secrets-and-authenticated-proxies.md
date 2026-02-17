# Agent secrets and authenticated proxies

Agents often need to interact with authenticated external services (GitHub API, npm registry, deployment targets, etc.). Currently there's no built-in way for dust to provide credentials to agents.

Two complementary approaches could address this:

**1. CLI utility exposing secrets as environment variables**

A `dust secret set/get` command backed by keychain or encrypted storage. Secrets would be injected into spawned agent processes via the existing `env` pass-through in `spawn-claude-code.ts`. Simple and composable - any subprocess inherits the credentials.

**2. Implicitly authenticated local proxies**

Dust runs local proxy services that agents hit for key interactions. The proxy transparently adds auth headers, so secrets never enter the agent's environment. This enables fine-grained access control, audit trails, and rate limiting.

A git credential helper (`dust credential-helper`) could cover git push/pull auth specifically.

## Open Questions

### Which mode should secrets be available in?

#### Interactive mode only

Env var injection is sufficient when a human is watching. Low risk, simple implementation.

#### Unattended (loop/bucket) mode too

Autonomous agents need credentials but the blast radius is larger. Proxies are safer here since they can enforce read-only access or scope to specific resources.

#### Both, with different mechanisms per mode

Env vars for interactive, proxies for unattended. More complex but matches the risk profile of each mode.

### Should dustbucket.com centralize secret management for fleet mode?

#### Yes, centralize in dustbucket

Dustbucket already manages repos and tasks for bucket mode. Centralizing secrets there means one place to configure credentials for fleet-scale agent runs. The proxy could even run server-side.

#### No, keep secrets local

Simpler trust model. Secrets stay on the machine running the agent. Dustbucket only orchestrates tasks, not credentials.

### How should secrets be stored locally?

#### OS keychain (macOS Keychain, libsecret, etc.)

Most secure. Leverages platform credential storage. Harder to implement cross-platform.

#### Encrypted file in ~/.dust/

Simpler, portable, but requires managing an encryption key. Similar pattern to credentials.json today but encrypted at rest.

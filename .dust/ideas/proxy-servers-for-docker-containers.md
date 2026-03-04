# Proxy Servers for Docker Containers

Docker containers started by `dust bucket worker` should not include any secrets. Access to the dustbucket server, git, and other authenticated services should happen via proxy servers running on the host. This architecture prevents agents from exfiltrating secrets, since the secrets never enter the container.

## Current State

### Implemented

The git credential proxy is now implemented:

- `lib/proxy/git-credential-proxy.ts` provides an HTTP server that proxies git requests, injecting credentials via `git credential fill` on the host
- Docker containers no longer mount `~/.ssh` or `~/.gitconfig`
- When `gitProxyUrl` is set in the Docker spawn config, git URLs are rewritten via `GIT_CONFIG_*` environment variables to route through the proxy

### Remaining

Secrets are still passed directly into Docker containers:

- `CLAUDE_CODE_OAUTH_TOKEN` and `OPENAI_API_KEY` are passed via `-e` flags
- `~/.claude/` is mounted for OAuth token refresh
- The dustbucket token is stored in `~/.dust/credentials.json` which agents could read
- HTTP proxy for general API requests is not implemented
- Dust events proxy is not implemented
- Network isolation is not implemented

See [Securing Bucket Access Tokens from Agents](securing-bucket-access-tokens-from-agents.md) for a detailed threat analysis.

## Proposed Architecture

The host machine runs proxy servers that the Docker container connects to instead of external services. The proxies handle authentication transparently:

```
┌─────────────────────────────────────────────────────────────┐
│                      Docker Container                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                     Agent (Claude)                   │   │
│  │                                                      │   │
│  │  git push → proxy:3001   HTTP → proxy:3002          │   │
│  │  events → proxy:3003                                │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                  │
└──────────────────────────┼──────────────────────────────────┘
                           │
          Docker network (host.docker.internal)
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                   Host Machine                              │
│  ┌───────────┐  ┌────────────┐  ┌────────────────────┐     │
│  │ Git Proxy │  │ HTTP Proxy │  │ Dust Events Proxy  │     │
│  │ :3001     │  │ :3002      │  │ :3003              │     │
│  └─────┬─────┘  └─────┬──────┘  └─────────┬──────────┘     │
│        │              │                   │                 │
│        ▼              ▼                   ▼                 │
│    GitHub.com    External APIs      dustbucket.com         │
│    (with SSH     (with OAuth        (with bucket           │
│     keys)         tokens)            token)                 │
└─────────────────────────────────────────────────────────────┘
```

### Proxy Types

**Git Proxy**: Handles git operations (clone, push, pull) by intercepting git protocol traffic and injecting SSH or HTTPS credentials. Could use `git-credential-helper` or a SOCKS proxy.

**HTTP Proxy**: Handles outbound HTTP requests. Can inject OAuth tokens for known services (GitHub API, npm registry), block requests to unknown hosts, and log all traffic for audit.

**Dust Events Proxy**: Receives agent events (session started, activity, ended) and forwards them to dustbucket.com with the user's bucket token. The agent only knows about the local proxy endpoint.

### Container Configuration

Instead of mounting credentials, containers would be configured with:

- `GIT_PROXY_COMMAND` or `GIT_SSH_COMMAND` pointing to the proxy
- `HTTP_PROXY` / `HTTPS_PROXY` environment variables
- `DUST_EVENTS_URL=http://host.docker.internal:3003`
- Network policy restricting outbound connections to the proxy only

### Network Isolation

For complete secret protection, the container should have no direct internet access:

```dockerfile
# In container network setup
--network=none  # No default network
--add-host=host.docker.internal:host-gateway  # Only proxy access
```

This ensures agents cannot bypass the proxy to exfiltrate secrets.

## Implementation Components

### 1. Proxy Server Module

A new `lib/proxy/` module containing:

- `git-proxy.ts`: Git protocol proxy with credential injection
- `http-proxy.ts`: HTTP proxy with allowlisting and token injection
- `events-proxy.ts`: Dust events forwarder
- `proxy-manager.ts`: Lifecycle management for all proxies

### 2. Container Launch Changes

Modify `buildDockerRunArguments()` in `lib/claude/spawn-claude-code.ts` to:

- Stop mounting credential files
- Stop passing secret environment variables
- Configure proxy environment variables
- Set up network isolation

### 3. Proxy Lifecycle in bucket.ts

The bucket command would:

1. Start proxy servers before spawning any containers
2. Pass proxy endpoints to container configuration
3. Shut down proxies on exit

### 4. Event Protocol Changes

The dust event protocol (`lib/bucket/events.ts`) would need a mode where events are sent to a local proxy instead of directly to dustbucket.com.

## Security Properties

When fully implemented, this architecture provides:

- **No secret exposure**: Containers never see tokens, SSH keys, or credentials
- **Audit trail**: All external communication is logged by proxies
- **Fine-grained control**: Proxies can enforce allowlists, rate limits, and read-only access
- **Defense in depth**: Even if an agent escapes the container, secrets aren't on the host filesystem accessible to the agent user

## Related Ideas

- [Agent Secrets and Authenticated Proxies](agent-secrets-and-authenticated-proxies.md) - broader secret management approach
- [Securing Bucket Access Tokens from Agents](securing-bucket-access-tokens-from-agents.md) - threat analysis
- [Docker Agent Mode](../facts/docker-agent-mode.md) - current Docker implementation

## Open Questions

### Should proxies run per-container or shared across containers?

#### Per-container proxies

Each container gets its own proxy instances on unique ports. Provides complete isolation between repositories but increases resource usage and complexity.

#### Shared proxies with session identification

A single set of proxies serves all containers. Each container passes a session ID in requests so proxies can route and log appropriately. More efficient but requires request modification.

### How should git authentication work through the proxy?

#### SSH agent forwarding via proxy

The proxy implements an SSH agent that the container connects to. The proxy forwards signing requests to the host's SSH agent but never exposes the private key.

#### HTTPS with credential injection

Force git to use HTTPS URLs. The proxy rewrites requests to add OAuth tokens or basic auth headers. Simpler than SSH but changes the git URL scheme.

#### Git credential helper over socket

The container runs a git-credential helper that queries the proxy over a socket. The proxy returns credentials per-request, enabling fine-grained access control.

### What network isolation strategy should be used?

#### Docker network with no default route

Create a custom Docker network that only routes to the host. Simple to implement but may not work on all Docker setups.

#### iptables/nftables rules inside container

Run iptables rules that block all outbound except proxy ports. Requires CAP_NET_ADMIN or privileged mode.

#### gVisor/Firecracker sandbox

Use a more restrictive container runtime that enforces network policy at a lower level. Most secure but adds operational complexity.

### Should there be an allowlist for proxied HTTP requests?

#### Strict allowlist

Only allow requests to a predefined set of hosts (github.com, npm registry, etc.). Blocks all other outbound HTTP. Safest but may break legitimate agent functionality.

#### Audit mode without blocking

Allow all requests but log them. The user can review what the agent accessed. Useful for observability without breaking functionality.

#### Configurable per-repository

Let users configure allowed hosts in `.dust/config/settings.json` or a new `.dust/proxy-allowlist.json`. Flexible but more configuration burden.

### Should this be opt-in or the default for Docker mode?

#### Opt-in via flag

Add `--proxy` flag to `dust bucket worker` and `dust loop`. Users who want the extra security explicitly enable it. Lower friction for adoption.

#### Default when Docker mode is detected

If a `.dust/Dockerfile` exists, automatically use proxies. Users who want the old behavior must opt out. Safer default but more breaking.

#### Required for bucket mode, optional for loop

Since bucket mode is unattended and higher risk, require proxies there. Loop mode can remain optional since a human is more likely watching.

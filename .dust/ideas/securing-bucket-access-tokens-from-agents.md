# Securing Bucket Access Tokens from Agents

Agents running in `dust bucket` and `dust loop` modes can access and potentially exfiltrate the bucket access token. This is a significant security risk, particularly in autonomous/unattended modes where agents have broad permissions.

## Current State

### Token Storage and Usage

The bucket access token is stored in `~/.dust/credentials.json` (`lib/bucket/auth.ts:27-29`) and can also be provided via the `DUST_BUCKET_TOKEN` environment variable (`lib/cli/commands/bucket.ts:822`).

When the `dust bucket` command runs:
1. Token is loaded from env var or stored credentials
2. Token is used to authenticate the WebSocket connection to dustbucket.com
3. Repository loops are spawned to run agent sessions

### Agent Environment Inheritance

Agent processes are spawned via `spawnClaudeCode()` (`lib/claude/spawn-claude-code.ts:63-67`):

```typescript
const proc = dependencies.spawn('claude', claudeArguments, {
  cwd,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, ...env },
})
```

This means agents inherit the full parent environment, including any `DUST_BUCKET_TOKEN` that was set. Even if the token isn't in an env var, agents can read the credentials file directly since they have filesystem access.

### Exfiltration Vectors

An agent could extract the token via:
1. **File read**: `cat ~/.dust/credentials.json`
2. **Environment variable**: Access `DUST_BUCKET_TOKEN` if the user set it
3. **Network exfiltration**: Send the token to an attacker-controlled server

Once exfiltrated, an attacker could:
- Connect to dustbucket.com as the user
- Receive the user's repository list
- Add tasks to repositories (if the API supports it)
- Access repository URLs and metadata

## Possible Approaches

### Proxy all agent network traffic

Run agents behind a network proxy that blocks outbound connections to non-allowlisted destinations. This prevents exfiltration but is operationally complex and may break legitimate agent HTTP calls.

### Remove token from agent environment

Filter sensitive variables when spawning agent processes. Currently `buildUnattendedEnv()` in `lib/session.ts` builds the env passed to agents. This could be extended to explicitly exclude `DUST_BUCKET_TOKEN` and similar sensitive variables.

However, this doesn't prevent reading `~/.dust/credentials.json` from the filesystem.

### Use short-lived, scoped tokens

Instead of a long-lived user token, issue per-session tokens with:
- Short expiry (e.g., 15 minutes, refreshed by the bucket daemon)
- Limited scope (e.g., can only send events for specific repositories)
- Revocation on session end

This limits blast radius but requires dustbucket.com server changes.

### Run agents in isolated sandboxes

Use container isolation (Docker, gVisor, Firecracker) to run agents without access to `~/.dust/`. The bucket daemon would run outside the sandbox and proxy events on behalf of agents.

This is the approach contemplated in [Autonomous Agents Need Sandboxes](../facts/autonomous-agents-need-sandboxes.md) and the per-repo Dockerfile task.

### Server-side authentication proxy

Similar to [Agent secrets and authenticated proxies](agent-secrets-and-authenticated-proxies.md), run a local proxy that agents use for bucket communication. The proxy holds the token; agents only get a local endpoint. Agents can send events but never see the actual token.

For full protection, combine with network isolation so agents can only reach the local proxy, not the internet.

## Open Questions

### Should we prevent token exfiltration or limit its impact?

#### Prevent exfiltration entirely

Use sandboxing and network isolation so agents cannot access tokens or send data to arbitrary endpoints. Most secure, but operationally heavy.

#### Limit impact via short-lived tokens

Accept that exfiltration is possible but minimize damage by using scoped, short-lived tokens that are automatically revoked. Simpler to implement but requires server-side changes.

#### Do both

Defense in depth: sandbox agents AND use short-lived tokens. Belt and suspenders.

### Should this be addressed at the dust level or dustbucket.com level?

#### Dust-side (client)

Filter environment, recommend sandboxing, provide tooling for secure agent execution. Works for all users regardless of how they authenticate.

#### Dustbucket.com-side (server)

Implement short-lived tokens, token scoping, audit logs, and anomaly detection. Protects users of the hosted service but doesn't help self-hosted or local-only users.

#### Both

Client-side hardening plus server-side token improvements provide the strongest protection.

### What is the acceptable operational complexity?

#### Low complexity: env filtering only

Quick win: filter `DUST_BUCKET_TOKEN` and similar from agent environments. Doesn't prevent file-based exfiltration but raises the bar.

#### Medium complexity: local auth proxy

Agents talk to `localhost:PORT` instead of dustbucket.com directly. Proxy handles auth. Requires dust to manage the proxy lifecycle but doesn't require containers.

#### High complexity: full sandbox

Run each agent in an isolated container with no access to host filesystem or direct network. Most secure but requires Docker and significantly changes the runtime model.

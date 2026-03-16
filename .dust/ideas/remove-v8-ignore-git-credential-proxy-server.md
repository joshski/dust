# Remove v8 Ignore: Git Credential Proxy Server

Remove the v8 coverage exclusion for `createGitCredentialProxyServer()` in [`lib/proxy/git-credential-proxy.ts`](../../lib/proxy/git-credential-proxy.ts) by restructuring for testability.

## Current State

Lines 175-305 exclude the entire server function (~130 lines):

```typescript
/* v8 ignore start - HTTP server integration, tested via system tests */
export async function createGitCredentialProxyServer(
  dependencies: GitCredentialProxyDependencies
): Promise<GitCredentialProxyServer>
/* v8 ignore stop */
```

The server handles:
- Git smart HTTP protocol requests
- Repository path parsing
- Credential injection from git credential helper
- Request/response proxying to upstream HTTPS

## Why This Matters

Similar to the Claude API proxy, this exclusion hides substantial logic. The git protocol handling, credential injection, and error paths would benefit from unit test coverage.

## Restructuring Approach

**Extract protocol logic to pure functions:**

1. `parseGitProxyRequest(url: URL)` - Extract endpoint and repo info
2. `buildUpstreamRequest(repoInfo, credentials)` - Construct authenticated request
3. `mapProxyResponse(upstreamResponse)` - Handle response transformation

The server becomes a thin wrapper calling these functions, minimizing the exclusion scope.

## Relationship to Claude API Proxy

Both proxy servers follow the same pattern. A shared restructuring approach could:
- Define a common `ProxyServerBuilder` pattern
- Extract request/response handling to testable functions
- Minimize exclusions to the `httpCreateServer` boilerplate

## Benefits

- Git protocol parsing becomes testable
- Credential handling logic verified
- Error paths covered
- Consistent with Claude API proxy refactoring

## Open Questions

### Should the two proxy servers share infrastructure?

#### Option: Independent refactoring

Each proxy evolves separately. Simpler initial implementation.

#### Option: Shared proxy utilities

Extract common patterns (server creation, response streaming, error handling) to a shared module. More DRY but couples the modules.

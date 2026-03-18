# Make gitSshUrl Mandatory

When listing repositories from the bucket server, `gitSshUrl` is currently optional while `gitUrl` (HTTPS) is required.

## Current Behavior

The `Repository` interface in `lib/bucket/repository.ts:62-69` defines:

```typescript
export interface Repository {
  name: string
  gitUrl: string        // Required - HTTPS clone URL
  gitSshUrl?: string    // Optional - SSH clone URL
  url: string
  id: number
  agentProvider?: string
}
```

The clone process in `lib/bucket/repository-git.ts:56-88` uses a fallback strategy:
1. Try HTTPS clone using `gitUrl`
2. If HTTPS fails and `gitSshUrl` is available, try SSH clone
3. Report failure if both fail (or just HTTPS if no SSH URL provided)

## Motivation

Making `gitSshUrl` mandatory would ensure the SSH fallback is always available. This matters because:

- **Authentication consistency**: HTTPS clones may fail when the agent environment lacks GitHub token credentials, but SSH keys are often configured system-wide
- **Private repository access**: Some deployment environments configure SSH keys but not HTTPS tokens
- **Predictable behavior**: The fallback path would always be available, reducing variance in clone success rates

## Considerations

The server (dustbucket) would need to ensure it always provides `gitSshUrl` for every repository. For GitHub, this is straightforward since every HTTPS URL has a corresponding SSH URL.

Making the field mandatory is a **breaking change** to the bucket protocol. Older clients that send `gitSshUrl: undefined` would need to be updated, and the server must always populate this field.

## Open Questions

### Should we require gitSshUrl in the protocol?

#### Yes, make gitSshUrl mandatory

Ensures the SSH fallback is always available. The server can always derive the SSH URL from the repository metadata. Clients get more reliable cloning behavior.

This is a breaking protocol change but aligns with "Batteries Included" - agents should have everything they need to succeed.

#### No, keep gitSshUrl optional

The current fallback behavior works well enough. Some deployments may only have HTTPS credentials configured, and forcing SSH URLs serves no purpose there. Keeping it optional maintains backward compatibility with existing server implementations.

#### Make gitSshUrl recommended but not required

Document that servers should provide `gitSshUrl` when available, but don't enforce it in the protocol. This preserves compatibility while encouraging better behavior.

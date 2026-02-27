# SSH host key acceptance for clone

Add `GIT_SSH_COMMAND` to the clone environment in `dust bucket` so SSH clones don't hang on first-time host key verification.

## Motivation

When `cloneRepository` in `lib/bucket/repository-git.ts` clones a repo over SSH for the first time, SSH prompts to accept the host key. Since stdio is set to `['ignore', 'pipe', 'pipe']`, this prompt hangs indefinitely. This is the SSH equivalent of the existing `GIT_TERMINAL_PROMPT: '0'` which handles the HTTPS case.

## Implementation

In `lib/bucket/repository-git.ts` line 31, add to the spawn env:

```typescript
env: {
  ...process.env,
  GIT_TERMINAL_PROMPT: '0',
  GIT_SSH_COMMAND: 'ssh -o StrictHostKeyChecking=accept-new',
},
```

`StrictHostKeyChecking=accept-new` auto-accepts the host key on first connection but rejects if it changes later, so it's not insecure.

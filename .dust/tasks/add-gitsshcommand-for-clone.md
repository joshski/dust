# Add GIT_SSH_COMMAND for Clone

Add `GIT_SSH_COMMAND` to the clone environment in `dust bucket` so SSH clones don't hang on first-time host key verification.

## Why

When `cloneRepository` in `lib/bucket/repository-git.ts` clones a repo over SSH for the first time, SSH prompts to accept the host key. Since stdio is set to `['ignore', 'pipe', 'pipe']`, this prompt hangs indefinitely. This is the SSH equivalent of the existing `GIT_TERMINAL_PROMPT: '0'` which handles the HTTPS case.

## Implementation

In `lib/bucket/repository-git.ts`, add `GIT_SSH_COMMAND` to the spawn env in `cloneRepository`:

```typescript
env: {
  ...process.env,
  GIT_TERMINAL_PROMPT: '0',
  GIT_SSH_COMMAND: 'ssh -o StrictHostKeyChecking=accept-new',
},
```

`StrictHostKeyChecking=accept-new` auto-accepts the host key on first connection but rejects if it changes later, preserving security against MITM attacks on known hosts.

## Principles

- [Agent Autonomy](../principles/agent-autonomy.md)
- [Cross-Platform Compatibility](../principles/cross-platform-compatibility.md)

## Blocked By

(none)

## Definition of Done

- [ ] `GIT_SSH_COMMAND` env var is added to the spawn call in `cloneRepository`
- [ ] SSH option uses `StrictHostKeyChecking=accept-new` (not `no`)

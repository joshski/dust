# Clone repositories via HTTPS with SSH fallback

Add SSH URL fallback to repository cloning. Currently dust only reads `gitUrl` (HTTPS) from the `repository-list` message and ignores `gitSshUrl`. dustbucket already sends both URLs.

### Changes required

1. **`lib/bucket/repository.ts`** — Add optional `gitSshUrl?: string` to the `Repository` interface.
2. **`lib/bucket/server-messages.ts`** — Parse `gitSshUrl` from the repository-list message in `parseServerMessage()`.
3. **`lib/bucket/repository-git.ts`** — In `cloneRepository()`, if the HTTPS clone fails and a `gitSshUrl` is available, retry with the SSH URL. `GIT_TERMINAL_PROMPT=0` is already set so HTTPS auth failure won't hang.

## Principles

- [Agent Autonomy](../principles/agent-autonomy.md)
- [Actionable Errors](../principles/actionable-errors.md)

## Blocked By

(none)

## Definition of Done

- [ ] `Repository` interface includes optional `gitSshUrl` field
- [ ] `parseServerMessage` extracts `gitSshUrl` when present
- [ ] `cloneRepository` attempts HTTPS first, falls back to SSH on failure
- [ ] Unit tests cover the fallback path
- [ ] `bin/dust lint` passes

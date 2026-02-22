# Log repository details comprehensively

Log each repository's full details on a separate line when receiving a `repository-list` websocket message.

## Current Behavior

The system logs a single line with comma-separated repository names:
```
Received repository list: repo-a (has task), repo-b, repo-c
```

## Desired Behavior

Log a summary line followed by one line per repository showing all attributes:
```
Received repository list (3 repositories):
  - name=repo-a, id=123, gitUrl=git@..., url=https://..., hasTask=true
  - name=repo-b, id=456, gitUrl=git@..., hasTask=false
  - name=repo-c, id=789, gitUrl=git@..., hasTask=false
```

This provides the full picture at a glance when debugging connection issues or verifying repository data.

## Implementation

Modify `ws.onmessage` handler in `lib/cli/commands/bucket.ts` (around line 600) to:
1. Log a summary line with the count
2. Log each repository on its own line with all known attributes (name, id, gitUrl, url, hasTask)
3. Omit attributes that are undefined/missing

## Principles

- [Comprehensive Assertions](../principles/comprehensive-assertions.md) - Log the whole picture, not partial fragments
- [Debugging Tooling](../principles/debugging-tooling.md) - Structured, readable output aids diagnosis

## Blocked By

(none)

## Definition of Done

- [ ] Repository list logging shows count and per-repository details
- [ ] Each repository line includes all available attributes (name, id, gitUrl, url, hasTask)
- [ ] Missing attributes are omitted cleanly
- [ ] Tests updated to verify new log format

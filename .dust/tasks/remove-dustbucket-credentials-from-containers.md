# Remove Dustbucket Credentials from Containers

Ensure that dustbucket credentials (`~/.dust/credentials.json`) are never accessible from within Docker containers.

Currently, events are already sent from the host process (not the container) via WebSocket, so containers shouldn't need direct dustbucket access. This task is about verifying that assumption and closing any gaps.

## Blocked By

(none)

## Definition of Done

- [ ] Verified that `~/.dust/credentials.json` is not mounted or accessible in containers
- [ ] No dustbucket token is passed as an environment variable to containers
- [ ] The event flow (container stdout → host process → WebSocket to dustbucket) still works
- [ ] Tests confirming credentials are absent from container configuration

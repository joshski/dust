# Add `dust bucket container` process

Implement the container process that manages dust loops across multiple repositories.

## Requirements

1. Add `dust bucket container` subcommand
2. Expect `DUST_API_TOKEN` environment variable to be set
3. Establish its own WebSocket connection to dustbucket for receiving repository lists and sending events
4. Manage temp directories for each repository (named by repo name, e.g., `dust-bucket-joshski-dust/`)
5. Clone repositories on first add, delete on removal
6. Run async loops for all repositories concurrently (not subprocess per loop)

## Implementation Notes

- The container coordinates multiple concurrent loops using async/await
- Each loop iteration: git pull → check tasks → run iteration → sleep
- Use `subprocess per dust invocation` pattern: spawn the repo's `dustCommand` for each check/execution
- Read each repo's `dustCommand` from its `.dust/config/settings.json`
- Handle repository additions/removals from incoming `repository-list` events

## Repository Loop Lifecycle

For each repository, run an async loop:
1. `git pull` to sync with remote
2. Check for tasks using the repo's `dustCommand`
3. If tasks exist, invoke the repo's `dustCommand` with appropriate arguments
4. If no tasks, sleep before checking again
5. Continue until the repository is removed from the list

## Testing

- Unit tests with injectable dependencies (spawn, filesystem, WebSocket)
- Test repository addition/removal
- Test loop lifecycle

## Goals

- [Dependency Injection](../goals/dependency-injection.md)
- [Agent Autonomy](../goals/agent-autonomy.md)
- [Unit Test Coverage](../goals/unit-test-coverage.md)
- [Decoupled Code](../goals/decoupled-code.md)

## Blocked By

- [Add `dust bucket` entry point command](./add-dust-bucket-entry-point-command.md)

## Definition of Done

- [ ] Container process receives and handles `repository-list` events
- [ ] Temp directories created/deleted as repos are added/removed
- [ ] Concurrent async loops run for each repository
- [ ] Each iteration invokes the repo's own `dustCommand` as subprocess
- [ ] Unit tests cover repository management and loop coordination

# Add `dust bucket` command

A command that connects to a dustbucket server via WebSocket and manages multiple dust loop processes across repositories.

## Overview

```bash
dust bucket <token>
```

The command:

1. Opens a WebSocket connection to `https://dustbucket.com/agent/connect` with the token in an HTTP authorization header
2. Receives a list of repository URLs from the server
3. Spawns a `dust loop claude` process for each repository
4. Provides a terminal UI for switching between repository logs
5. Dynamically adds/removes processes as the server sends updated repository lists

## Connection Protocol

### Authentication

The token is passed in the HTTP Authorization header when establishing the WebSocket connection:

```
Authorization: Bearer <token>
```

### Server Events

The server sends JSON events with an `event` field. The only event type currently specified is `repository-list`:

```typescript
interface RepositoryListEvent {
  event: "repository-list"
  repositories: Array<{
    gitUrl: string
  }>
}
```

Subsequent `repository-list` events update the set of managed repositories:

- New URLs cause dust to spawn new processes
- Removed URLs cause dust to kill their processes

## Process Management

### Per-Repository Workspace

Each repository process runs in a temporary directory that:

- Is created when the repository is first added
- Persists between Claude invocations (allowing incremental work)
- Is deleted when the repository is removed from the list or the command exits

The directory serves as the `cwd` for the spawned `dust loop claude` process.

### Process Lifecycle

1. Clone the repository into the temp directory (or pull if already cloned)
2. Spawn `dust loop claude` with the temp directory as cwd
3. Stream stdout/stderr to the log buffer for that repository
4. Restart the loop if it exits (respecting iteration limits or errors)
5. Kill the process and delete the directory when the repository is removed

## Terminal UI

A simple terminal interface that:

- Shows which repository is currently "focused" (its logs are displayed)
- Allows switching between repositories (keyboard shortcuts or numbered selection)
- Aggregates/summarizes status across all repositories
- Displays real-time logs from the focused repository

### Possible UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [1] joshski/dust (running)  [2] joshski/dustbucket (idle)   │
├─────────────────────────────────────────────────────────────┤
│ [dust loop output for focused repository]                   │
│ ...                                                         │
│ ...                                                         │
└─────────────────────────────────────────────────────────────┘
Press 1-9 to switch repos, q to quit
```

## Relationship to Existing Ideas

This command implements the "Central orchestration via dustbucket" concept from `.dust/ideas/dust-up-extensions.md`, where dustbucket acts as an active control plane rather than a passive dashboard.

It also relates to `.dust/ideas/multi-repo-fleet-orchestration.md` but with a key difference: instead of `dust fleet` being the orchestrator, dustbucket is the orchestrator and `dust bucket` is a worker that receives instructions.

## Implementation Considerations

### WebSocket Library

The codebase currently has no WebSocket dependencies. Options:

1. Use the native `WebSocket` class (available in Node.js 22+ and Bun)
2. Add the `ws` package for broader compatibility

Given the project's `minimal-dependencies` goal, using native WebSocket if the runtime supports it would be preferred, with a fallback or error message if not.

### Git Operations

The command needs to clone repositories. This can reuse the existing `GitRunner` from `lib/cli/process-runner.ts`.

### Event Posting

If `eventsUrl` is configured, the bucket command should post events similar to the loop command. New event types might include:

- `bucket.connected` - WebSocket connection established
- `bucket.repository_added` - New repository added
- `bucket.repository_removed` - Repository removed
- `bucket.process_started` - Loop process started for a repo
- `bucket.process_stopped` - Loop process stopped

### Testing

Following the project's dependency injection patterns, the command should accept injectable dependencies:

- WebSocket client (for testing without real connections)
- Process spawner (for testing process management)
- File system (for testing temp directory management)

## Open Questions

### How should the terminal UI be implemented?

#### Raw stdin/stdout with ANSI codes

Simple, no dependencies, but limited functionality. Would need to handle raw mode, cursor positioning, and screen clearing manually.

#### Use a TUI library like ink or blessed

More powerful UI capabilities but adds dependencies, conflicting with the minimal-dependencies goal.

#### No interactive UI, just multiplexed output with prefixes

Each line of output is prefixed with the repo name (e.g., `[dust] ...`, `[dustbucket] ...`). Simpler but less usable with many repos.

### What happens if the WebSocket connection drops?

#### Reconnect automatically

The command attempts to reconnect with exponential backoff. Running processes continue during disconnection.

#### Exit gracefully

The command stops all processes and exits, expecting to be restarted externally.

#### Prompt the user

Ask whether to reconnect or exit.

### Should there be a maximum number of concurrent repositories?

#### No limit

Let the server control the number of repositories. The local machine handles whatever it can.

#### Configurable limit

A `--max-repos` flag or config setting caps concurrent processes. Excess repos are queued or rejected.

### How should repository identity be determined?

#### Exact URL matching

Treat `git@github.com:user/repo.git` and `https://github.com/user/repo.git` as different repositories.

#### Normalized URL comparison

Normalize URLs before comparison so equivalent repos are recognized as the same.

### Should the command support running without authentication for local development?

#### Yes, with a --url flag

A `--url` flag overrides the default dustbucket URL. Authentication is optional when connecting to localhost.

#### No, always require authentication

Keep the protocol simple by always requiring a token, even for local testing.

### How should the temp directories be named?

#### Random UUIDs

Use `dust-bucket-a1b2c3d4/` style names. Simple and collision-free but harder to debug.

#### Based on repo name

Use `dust-bucket-joshski-dust/` style names. Easier to identify but needs careful escaping of special characters.

#### Based on URL hash

Use `dust-bucket-<hash>/` style names. Collision-free and handles special characters, but not human-readable.

### Should the command inherit eventsUrl from settings or have its own configuration?

#### Use existing eventsUrl setting

Events go to whatever is configured in settings. Consistent with other commands.

#### WebSocket to dustbucket is the implicit event destination

Since there's already a WebSocket connection to dustbucket, use it for events. Reduces configuration.

#### Support both

Use WebSocket for dustbucket events by default, but also post to eventsUrl if configured.

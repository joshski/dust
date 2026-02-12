# Add `dust bucket` command

A command that connects to a dustbucket server via WebSocket and manages dust loops across multiple repositories.

## Overview

```bash
dust bucket <token>
```

The command connects to dustbucket and manages loops for multiple repositories. It uses a multi-layer process architecture designed to be resilient to changes to dust itself.

## Architecture

### Process Hierarchy

The architecture uses three layers of processes:

1. **`dust bucket <token>`** - The entry point process
   - Connects to dustbucket via WebSocket
   - Receives repository list from server
   - Spawns a **single** container process (not one per repository)

2. **`dust bucket container`** - The container process
   - Expects `DUST_API_TOKEN` environment variable to be set
   - Manages temp directories for each repository
   - Runs dust loops for all repositories **without** spawning subprocesses per loop
   - Each loop iteration: git pull, then invoke the repo's configured `dustCommand` with fresh execution

3. **Per-iteration execution** - Each loop iteration
   - Uses the repo's configured `dustCommand` (from `.dust/config/settings.json`)
   - Runs the current version of dust after pulling
   - This ensures dust updates in a repo are immediately used

### Resilience to Dust Updates

The key architectural goal is that if dust itself is updated in a repository, the new version should be used immediately. This is achieved by:

1. The container process does NOT import dust modules directly for loop logic
2. Each iteration pulls the repo, then invokes the repo's `dustCommand` as a subprocess
3. The subprocess runs whatever version of dust is in that repo

This means dust can update itself and the next iteration will use the new version.

### Why a Single Container Process?

Instead of spawning one process per repository (which would require inter-process coordination), the container runs all loops in a single process:

- Simpler resource management
- Easier event aggregation
- No need for IPC between repository workers
- Single point of connection back to dustbucket

The container process coordinates multiple concurrent loops using async/await, not subprocesses.

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

- New URLs cause dust to start a new loop for that repo
- Removed URLs cause dust to stop the loop and clean up the temp directory

## Process Management

### Per-Repository Workspace

Each repository has a workspace in a temporary directory that:

- Is created when the repository is first added
- Persists between iterations (allowing incremental work)
- Is deleted when the repository is removed from the list or the command exits

### Loop Lifecycle (Container Process)

For each repository, the container process runs an async loop:

1. **Pull**: `git pull` to sync with remote
2. **Check tasks**: Use the repo's `dustCommand` to check for available tasks
3. **Run iteration**: If tasks exist, invoke the repo's `dustCommand` with appropriate arguments
4. **Sleep**: If no tasks, wait before checking again
5. **Repeat**: Continue until the repository is removed from the list

The container does NOT spawn subprocess per loop. Instead, it uses async iteration and invokes the repo's dust command directly for each task check/execution.

### Invoking the Repo's Dust Command

Each repository may have a different `dustCommand` configured in `.dust/config/settings.json` (e.g., `npx dust`, `bun run dust`, `./bin/dust`). The container must:

1. Read the repo's settings to get `dustCommand`
2. Use that command when invoking dust operations
3. This ensures each repo uses its own version of dust

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

### Codebase Context

The existing `loop.ts` command provides a reference implementation:

- **Event system**: Uses typed events (`DustWireEvent`) with console formatting and HTTP posting
- **Dependency injection**: `LoopDependencies` interface allows injecting spawn, run, sleep, and postEvent
- **Event poster**: `createEventPoster` handles sequenced event posting with agent session tracking
- **Git operations**: `gitPull` function shows the pattern for git operations with error handling
- **Claude integration**: Uses `lib/claude/run.ts` which handles spawning Claude Code with options

Key patterns to follow:
- Commands receive `CommandDependencies` with context, fileSystem, settings
- Settings loaded from `.dust/config/settings.json` include `dustCommand` and `eventsUrl`
- Process spawning uses `node:child_process` spawn with typed wrappers

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

### How should the entry point spawn the container process?

The entry point (`dust bucket <token>`) needs to spawn the container process. This spawn must be resilient to dust updates.

#### Spawn using the same executable

The entry point runs `dust bucket container` using the same executable that was used to start `dust bucket`. This means the container uses the same dust version as the entry point.

#### Spawn using a fresh invocation

The entry point clones a "bootstrap" repo first, then invokes its `dustCommand` with `bucket container`. This ensures even the container process can be updated.

#### Direct import (no subprocess)

The entry point doesn't spawn a subprocess at all - it just imports and runs the container logic directly. Simpler but means the container code is fixed at the version that started the entry point.

### How should the container invoke dust for each iteration?

The container needs to invoke dust commands for each repo's iteration. The task specifies that each iteration should use the current version of dust after pulling.

#### Subprocess per dust invocation

Each time the container needs to check tasks or run Claude, it spawns a subprocess: `${dustCommand} next` or `${dustCommand} loop claude --single-iteration`. This ensures the latest code is used but has process overhead.

#### Dynamic import/eval

The container could dynamically import the repo's dust modules after each pull. This avoids subprocess overhead but is complex and may have caching issues.

#### Shell execution

Run the `dustCommand` through a shell which will resolve the command fresh each time. Adds shell overhead but handles path resolution naturally.

### What arguments should `dust bucket container` receive?

The container process needs information to connect back to dustbucket and manage repositories.

#### Environment variables only

Pass everything via environment: `DUST_API_TOKEN`, `DUST_BUCKET_WS_URL`, `DUST_REPOSITORIES` (JSON array). Simple but limited by env var size constraints.

#### Command line arguments

Pass essential info as arguments: `dust bucket container --ws-url=... --repos=...`. More explicit but creates long command lines.

#### Config file

The entry point writes a temp config file, container reads it. Avoids length limits but adds file I/O.

### How should the container communicate back to the entry point?

The entry point manages the WebSocket to dustbucket. The container needs to send events (task started, completed, errors) back.

#### Container sends events directly via WebSocket

The container establishes its own WebSocket connection using the API token. Simple but duplicates the connection.

#### Container posts to entry point via IPC

The entry point listens on a socket/pipe, container posts events there, entry point forwards to dustbucket. More complex but single connection.

#### Container writes to stdout, entry point parses

The container emits JSON events to stdout, entry point reads and forwards. Uses existing stdio infrastructure.

### Should Claude invocations use `dangerouslySkipPermissions`?

The existing `dust loop claude` uses `dangerouslySkipPermissions: true` for unattended operation.

#### Yes, always skip permissions

Bucket workers are expected to run in sandboxes. Permission prompts would break autonomous operation.

#### Configurable per-repo

Let the server specify whether a repo should run with or without permissions. Useful for sensitive repos.

#### Require sandbox detection

Only skip permissions if running in a detected sandbox environment. Adds safety but complicates implementation.

### How should dust installations in repos be validated?

The container assumes each repo has dust installed and configured. What if it doesn't?

#### Fail fast with clear error

If `dustCommand` is missing or settings.json doesn't exist, emit an error event and skip that repo.

#### Attempt to install dust

Run `npm install` or similar before the first iteration. Handles repos that don't have dust pre-installed.

#### Require dust to be pre-installed

Document that repos must have dust installed. Keep the container simple.

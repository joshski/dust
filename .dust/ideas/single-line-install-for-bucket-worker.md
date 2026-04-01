# Single-Line Install for Bucket Worker

Running `dust bucket worker` should be trivially simple with one command.

**Status:** Refined and ready for design decisions.

**Key Constraint:** The worker must automatically self-update **even after it has started**, and when a new version is detected, it must **not take on any new work per repository** while completing in-flight work.

## Current State

Today, setting up a bucket worker requires several steps:

1. Install dust globally: `npm install -g @joshski/dust`
2. Run the worker: `dust bucket worker`
3. Authenticate via OAuth or token
4. Optionally set up Docker with `--docker` flag
5. Manually update by re-running npm install

The installation requires:
- Node.js or Bun runtime pre-installed
- npm package manager
- Git installed
- Docker (if running with `--docker` flag)

Updates require manually running `npm install -g @joshski/dust@latest`.

## Proposal

Enable a single command that:
- Installs dust if not present
- Authenticates with dustbucket
- Starts the worker
- Keeps itself updated automatically

Example vision:
```bash
curl -fsSL https://dustbucket.com/install | sh
```

This should:
- Detect the platform (Linux, macOS, Windows)
- Download the appropriate binary
- Install to a standard location (e.g., `~/.dust/bin/`)
- Add to PATH if needed
- Authenticate and start the worker
- Auto-update on subsequent runs

## Benefits

**For Users:**
- Removes barrier to entry (no need to install Node.js/npm)
- Works on any machine with curl/wget
- Self-updating eliminates maintenance burden
- Single command from bare metal to running agent

**For Dust:**
- Wider adoption (works without npm ecosystem)
- Users always run latest version
- Reduced support burden (fewer version issues)
- Better user experience aligns with easy-adoption principle

## Implementation Context

From codebase exploration:

**Current Architecture:**
- Version is embedded at build time from `package.json` (currently 0.1.108) via `lib/version.ts`
- Entry point is `lib/cli/commands/bucket-worker.ts`
- Authentication uses OAuth (browser flow) or `DUST_BUCKET_TOKEN` environment variable
- Credentials stored at `~/.dust/credentials.json`
- Machine ID stored at `~/.dust/machine-id` (or hostname fallback)
- Worker connects to `wss://dustbucket.com/agent/connect` via WebSocket
- Connection handshake: `connection-init` → `connection-ready` or `connection-rejected`
- `connection-rejected` can include optional `minimumVersion` field for version enforcement

**Repository Loop Architecture:**
- Each repository runs independent async loop in `lib/bucket/repository-loop.ts`
- Loop waits for `task-available` WebSocket message (with 5-minute fallback timeout)
- Each loop has `AbortController` for cancellation
- Repository states: idle, cloning, running, stopping
- On shutdown: cancels all loops, waits for promises, removes repository directories
- Container support: `--docker` or `--apple-container` flags for sandboxed execution
- Git credential proxy and Claude API proxy run during containerized sessions

**Current Update Mechanism:**
- **At connection**: Server can send `connection-rejected` with `minimumVersion` during handshake
- **While running**: No mechanism for detecting or applying updates
- **Version check**: Server validates client version only at connection time
- **Update handling**: Client logs rejection and shuts down without reconnecting
- **No self-update**: Manual `npm install -g @joshski/dust@latest` required

**File Locations:**
- `~/.dust/credentials.json` - OAuth token
- `~/.dust/machine-id` - Stable machine identifier
- `~/.dust/repositories/` - Cloned repositories workspace
- `~/.dust/logs/` - Runtime logs
- `.dust/config/container/Dockerfile` - Per-repo custom container image

**Relevant Principles:**
- **easy-adoption**: Dust should be trivially easy to adopt
- **batteries-included**: Dust should provide everything required
- **agent-autonomy**: Enable AI agents to produce work autonomously
- **self-contained-repository**: Developers should have everything they need within the repository
- **stop-the-line**: Any worker should halt and fix a problem the moment they detect it

**Relevant Facts:**
- **bucket-protocol.md**: WebSocket protocol with `connection-rejected` and `minimumVersion` support
- **bucket-worker-container-modes.md**: Container execution modes
- **autonomous-agents-need-sandboxes.md**: Security requirements for running agents

## Technical Constraints

Based on codebase exploration:

**Worker Long-Running Nature:**
- `dust bucket worker` runs indefinitely via WebSocket connection to `wss://dustbucket.com/agent/connect`
- Each repository runs an independent async loop (`runRepositoryLoop`) waiting for `task-available` signals
- Loops can be processing tasks for extended periods (multi-turn agent sessions)
- Worker maintains state: connection, credentials, cloned repositories, running Docker containers

**Current Update Detection:**
- Server can send `connection-rejected` with optional `minimumVersion` field during handshake
- No mechanism for detecting updates after connection is established
- No mechanism for graceful shutdown when update is required
- Binary replacement while process is running is complex (especially on Windows)

**Repository Loop Lifecycle:**
- Each repository has `AbortController` for cancellation
- Loops can be in states: idle (waiting for task), cloning, running (mid-iteration), stopping
- Current design: loops wait indefinitely for tasks with 5-minute fallback timeout
- No concept of "draining" mode where repository stops accepting new work but completes in-flight work

**Required Changes for Auto-Update:**
Per task requirements, the worker must **automatically self-update even after it has started** and **not take on any new work per repository when a new version is detected**. This means:
- Server needs a way to signal "update available" to connected clients (not just at handshake)
- Client needs a "draining" mode where existing work completes but no new tasks are accepted
- Client must gracefully shut down all repository loops before updating
- Update mechanism must handle the running process being replaced

## Open Questions

### How should update notifications flow from server to client?

#### Option: New WebSocket Message Type

Add `update-available` server-to-client message:
```typescript
interface UpdateAvailableMessage {
  type: 'update-available'
  version: string           // New version available
  minimumVersion?: string   // Optional: version is now required
  forceUpdate: boolean      // If true, must update immediately
}
```

**Pros:**
- Server can notify clients at any time
- Supports both optional and forced updates
- Client can start draining immediately
- Clear separation from connection rejection

**Cons:**
- Requires new protocol message type
- Server must track connected client versions
- More complex state machine

#### Option: Periodic Version Check

Client polls server API endpoint for latest version:
```typescript
// Every N minutes
const latest = await fetch('https://dustbucket.com/api/version/latest')
if (latest.version > currentVersion) {
  // Begin draining
}
```

**Pros:**
- No protocol changes needed
- Works independently of WebSocket connection
- Server doesn't need to track client versions
- Can work with non-dustbucket installations

**Cons:**
- Polling overhead (though minimal)
- Delayed detection (depends on polling interval)
- Requires separate API endpoint

#### Option: Connection Replacement Signal

Server closes existing connection with special code when update available:
```typescript
// Server sends close with code 4001 (custom: update-available)
// Client detects code, enters draining mode, updates, reconnects
```

**Pros:**
- No protocol changes
- Forces update by disconnecting
- Simple implementation

**Cons:**
- Breaks existing connection
- Can't distinguish between forced vs optional updates
- Disruptive if update is optional
- Client loses work queue visibility

### How should in-flight work be handled during updates?

#### Option: Drain and Wait

When update is detected:
1. Stop accepting new tasks (mark all repositories as "draining")
2. Wait for all in-flight agent sessions to complete
3. Shut down gracefully
4. Perform update
5. Restart

**Pros:**
- No work is interrupted
- Clean state transition
- Repositories finish their current task
- Matches task requirement: "not take on any new work per repository"

**Cons:**
- Update may be delayed significantly (agent sessions can run for minutes)
- Complex to implement draining state
- What if a session hangs indefinitely?

#### Option: Immediate Cancellation

When update is detected:
1. Cancel all repository loops via `AbortController`
2. Shut down immediately
3. Perform update
4. Restart
5. Server re-queues any interrupted work

**Pros:**
- Fast update
- Simple implementation
- Server already handles task re-queueing

**Cons:**
- Wastes work in progress
- May interrupt important operations (commits, pushes)
- Violates graceful shutdown principle
- Poor user experience

#### Option: Timeout-Based Drain

When update is detected:
1. Enter draining mode (stop accepting new work)
2. Wait up to N minutes for in-flight work
3. If timeout expires, cancel remaining work
4. Perform update

**Pros:**
- Balances completing work vs update speed
- Prevents indefinite delays
- Configurable timeout
- Matches task requirement with safety valve

**Cons:**
- Arbitrary timeout choice
- Some work may still be interrupted
- More complex state machine

### How should the update mechanism work technically?

#### Option: Self-Replacing Binary

Worker downloads new version and replaces itself:
```bash
# 1. Download new version to temporary location
# 2. Shut down current process
# 3. Move new binary to current location
# 4. Restart via exec or subprocess
```

**Pros:**
- Single binary approach
- No external updater needed
- Works for standalone installs

**Cons:**
- Complex to implement (especially Windows)
- File permissions issues
- Running process can't replace itself reliably
- Race conditions during replacement

#### Option: Wrapper Process

Separate updater process manages the worker:
```bash
dust-updater -> spawns -> dust bucket worker
# Updater monitors for update signals
# Shuts down worker, updates, restarts
```

**Pros:**
- Clean separation of concerns
- Updater can replace worker binary safely
- Can monitor and restart on crashes
- Similar to systemd/supervisor pattern

**Cons:**
- Two processes to maintain
- More complex installation
- Process management overhead
- Overkill for simple updates

#### Option: NPM-Based Auto-Update

If installed via npm, use npm for updates:
```typescript
// Detect update needed
await exec('npm install -g @joshski/dust@latest')
// Restart current process
process.exit(0) // Assuming systemd/docker restart
```

**Pros:**
- Leverages existing npm infrastructure
- Works with current installation method
- Simple implementation

**Cons:**
- Only works with npm installations (not standalone binary)
- Slower (npm install overhead)
- Requires Node.js/npm on system
- Doesn't work for binary distributions

### How should multi-repository state be coordinated during updates?

#### Option: Global Draining Mode

Single "draining" flag affects all repositories:
```typescript
let draining = false
// All repository loops check this flag before accepting work
```

**Pros:**
- Simple implementation
- Consistent state across repositories
- Easy to reason about

**Cons:**
- All-or-nothing approach
- Can't prioritize critical repositories
- No granular control

#### Option: Per-Repository Draining

Each repository tracks its own draining state:
```typescript
interface RepositoryState {
  draining: boolean
  currentIteration: Promise | null
}
```

**Pros:**
- Granular control
- Can drain repositories independently
- More flexible

**Cons:**
- More complex state management
- Coordination needed (when are we "done"?)
- Overkill for update use case

#### Option: Repository Loop Cancellation with Promise.allSettled

Use existing cancellation mechanism:
```typescript
// Trigger all AbortControllers
// Wait for all loop promises
await Promise.allSettled(repositoryLoops)
```

**Pros:**
- Uses existing cancellation infrastructure
- Simple implementation
- Doesn't require new state

**Cons:**
- Doesn't distinguish draining from cancellation
- Loses work in progress
- Not graceful

### Should updates require a restart or can they be hot-swapped?

#### Option: Restart Required

Update requires full process restart:
- Download new version
- Shut down gracefully
- Restart via systemd/docker/manual

**Pros:**
- Simple and safe
- Clean state transition
- Matches common practice (systemd, docker)
- No risk of stale code

**Cons:**
- Downtime during restart
- Requires process supervisor for auto-restart
- May interrupt long-running connections

#### Option: Hot Code Reload

Update code without restarting process:
- Download new version
- Reload modules dynamically
- Maintain WebSocket connection

**Pros:**
- No downtime
- Seamless updates
- Maintains connection state

**Cons:**
- Very complex to implement correctly
- Risk of stale references/closures
- Not supported well in Node.js/Bun
- May introduce subtle bugs
- Overkill for update frequency

#### Option: Graceful Restart with Reconnection

Process restarts but reconnects immediately:
- Enter draining mode
- Complete in-flight work
- Disconnect WebSocket
- Shut down process
- Restart (via systemd/docker or self-exec)
- Reconnect to server with new version

**Pros:**
- Clean restart with minimal downtime
- Leverages existing reconnection logic
- Server can queue tasks during brief disconnect
- Balances simplicity and user experience

**Cons:**
- Brief service interruption
- Requires external process manager or self-restart
- Connection state is lost (though server maintains it)

### How should the update sequence be coordinated?

#### Option: Server-Initiated Drain-Update-Reconnect

1. Server sends `update-available` message when new version detected
2. Client marks all repositories as draining (no new work)
3. Client waits for in-flight work to complete (with timeout)
4. Client sends `update-starting` acknowledgment to server
5. Client disconnects WebSocket
6. Client performs update (download + replace binary)
7. Client restarts process
8. Client reconnects with new version
9. Server sends queued repositories and tasks

**Pros:**
- Clear coordination protocol
- Server knows when client is updating
- Can queue work during update
- Matches task requirement exactly
- Graceful handling of in-flight work

**Cons:**
- Most complex option
- Requires new protocol messages
- Server must maintain state during client update
- Client must handle update failure

#### Option: Client-Initiated Update on Startup Only

1. Worker checks for updates only on startup
2. If update available, downloads and replaces binary before connecting
3. Restarts and connects with new version
4. While running, never updates

**Pros:**
- Simplest implementation
- No draining logic needed
- No protocol changes
- No risk of interrupting work

**Cons:**
- Violates task requirement: "automatically self-update even after it has started"
- Workers may run old versions indefinitely
- Defeats zero-maintenance goal
- Not acceptable per task constraints

#### Option: Periodic Background Update with Next-Startup Application

1. Worker periodically checks for updates while running
2. If update available, downloads in background
3. Waits for next natural restart opportunity
4. On next startup, applies downloaded update

**Pros:**
- Updates are pre-downloaded (fast application)
- No interruption to running work
- Simple draining (just don't restart until ready)

**Cons:**
- Update application is delayed
- Doesn't meet "automatically self-update even after it has started" if worker never restarts
- Still requires coordination of when to restart
- May accumulate stale downloaded updates

### How should the installation script be distributed?

#### Option: Shell Script via HTTP (RESOLVED)

Host an installation script at `https://dustbucket.com/install` that can be piped to `sh`:
```bash
curl -fsSL https://dustbucket.com/install | sh
```

**Pros:**
- Industry standard (used by Rust, Homebrew, Node.js installers)
- Works on any Unix-like system
- Easy to update centrally
- No dependencies beyond curl/wget

**Cons:**
- Requires user trust (piping to shell)
- Needs separate approach for Windows
- Requires hosting infrastructure

#### Option: Binary Distribution via GitHub Releases

Distribute pre-compiled binaries via GitHub releases:
```bash
# Linux/macOS
curl -L https://github.com/joshski/dust/releases/latest/download/dust-$(uname -s)-$(uname -m) -o ~/.dust/bin/dust

# Windows
# PowerShell equivalent
```

**Pros:**
- No shell script execution concerns
- Works with existing GitHub infrastructure
- Users can verify checksums
- Platform-specific binaries

**Cons:**
- Requires building for multiple platforms
- Less convenient (manual PATH setup)
- More steps than single-line install

#### Option: NPX Wrapper

Keep npm distribution but provide a self-updating wrapper:
```bash
npx @joshski/dust bucket worker --auto-update
```

**Pros:**
- Minimal changes to current architecture
- Works with existing npm distribution
- Familiar to JavaScript developers

**Cons:**
- Still requires Node.js/npm
- Doesn't remove installation barrier
- Defeats purpose of single-line install

### What technology should implement the self-update mechanism?

#### Option: Built-in Auto-Update Check (RESOLVED)

Add update checking to the worker itself:
- On startup, check dustbucket API for latest version
- Compare to current version
- Download and replace binary if newer available
- Restart worker with new version

**Pros:**
- Seamless user experience
- Works across installation methods
- Can be optional via flag

**Cons:**
- Requires robust error handling
- Complex for npm-based installation
- Potential permission issues on updates

#### Option: Separate Update Manager

Create a dedicated updater binary (e.g., `dust-updater`) that manages the main binary:
```bash
curl -fsSL https://dustbucket.com/install | sh
# Installs dust-updater, which manages dust binary
```

**Pros:**
- Cleaner separation of concerns
- Can update itself
- Handles permissions better

**Cons:**
- More complexity
- Two binaries to maintain
- Potential circular dependency issues

#### Option: NPM-Based Auto-Update

Keep using npm but add auto-update logic:
```typescript
// On worker startup
const latestVersion = await fetch('https://registry.npmjs.org/@joshski/dust/latest')
if (latestVersion > currentVersion) {
  await spawn('npm', ['install', '-g', '@joshski/dust@latest'])
  // Restart
}
```

**Pros:**
- Leverages existing npm infrastructure
- Simpler implementation
- No new distribution mechanism

**Cons:**
- Still requires npm installed
- Slower update process
- Doesn't achieve single-line goal

### Should the worker bundle Node.js runtime or remain runtime-agnostic?

#### Option: Bundle Node.js/Bun Runtime

Distribute as a standalone binary with runtime included:
- Use `pkg`, `nexe`, or similar to create single executable
- Include all dependencies
- No runtime installation needed

**Pros:**
- True single-binary distribution
- No runtime dependencies
- Consistent environment across machines

**Cons:**
- Large binary size (50-100+ MB)
- Must build for each platform
- Harder to leverage system npm packages
- May conflict with existing installations

#### Option: Remain Runtime-Agnostic (RESOLVED)

Keep requiring Node.js/Bun but make installation handle it:
- Installation script checks for runtime
- Installs Node.js if missing (via nvm, volta, etc.)
- Then installs dust

**Pros:**
- Smaller binary
- Leverages system Node.js
- Easier to update runtime separately

**Cons:**
- Complex installation script
- Different runtime versions across machines
- Still has dependencies

#### Option: Recommend System Package Managers

Don't bundle runtime, but distribute via platform package managers:
```bash
# macOS
brew install joshski/tap/dust

# Linux
apt-get install dust      # or snap, flatpak
```

**Pros:**
- Uses standard platform tools
- Handles dependencies automatically
- Built-in update mechanisms

**Cons:**
- Not truly single-line (different per platform)
- Requires maintaining multiple packages
- Slower to release updates

### Should Docker be included by default or remain optional?

#### Option: Bundle Docker Dependencies

Include Docker setup in the default installation:
- Install Docker if not present
- Build default container image
- Always run in containerized mode

**Pros:**
- Better security isolation
- Consistent environment
- Aligns with docker-by-default-for-agent-runtime idea

**Cons:**
- Much larger installation
- Docker may not be available (permissions, platform)
- Slows initial setup significantly

#### Option: Keep Docker Optional (RESOLVED)

Maintain current behavior where Docker is opt-in via `--docker` flag:
- Installation doesn't touch Docker
- Users can enable later if desired
- Native execution by default

**Pros:**
- Faster installation
- Fewer dependencies
- Works on more systems

**Cons:**
- Less secure by default
- Inconsistent environments
- Misses opportunity for batteries-included approach

### How should authentication be handled during installation?

#### Option: Interactive OAuth During Install (RESOLVED)

Installation script opens browser for OAuth immediately:
```bash
curl -fsSL https://dustbucket.com/install | sh
# Opens browser, user logs in, returns token
# Worker starts automatically
```

**Pros:**
- Complete setup in one step
- Better user experience
- No token management needed

**Cons:**
- Requires browser access
- May fail in headless environments
- Complex for script to handle

#### Option: Defer Authentication to First Run

Install the binary, but authenticate on first `dust bucket worker` run:
```bash
curl -fsSL https://dustbucket.com/install | sh
dust bucket worker
# Now prompts for authentication
```

**Pros:**
- Simpler installation script
- Works in headless environments (via token)
- Cleaner separation of concerns

**Cons:**
- Not truly single-line to running
- User must run second command

#### Option: Support Installation Tokens

Provide one-time installation tokens from dustbucket.com:
```bash
curl -fsSL https://dustbucket.com/install | sh -s -- --token=abc123
# Authenticates using provided token
```

**Pros:**
- Works in automation/CI
- True single-line install
- No browser needed

**Cons:**
- Requires dustbucket feature
- Token management overhead
- Security implications of token in command

### Should updates be automatic or user-controlled?

#### Option: Fully Automatic Updates (RESOLVED)

Worker updates itself without user intervention:
- Checks for updates on startup
- Downloads and applies automatically
- Restarts with new version

**Pros:**
- Users always on latest version
- No maintenance burden
- Reduces support issues

**Cons:**
- Unexpected behavior changes
- Potential breaking changes
- No rollback mechanism
- May interrupt work

#### Option: Automatic with Notification

Worker notifies user of updates but requires confirmation:
```
New version available: 0.1.109 -> 0.1.110
Run 'dust bucket worker --update' to upgrade
```

**Pros:**
- User maintains control
- Can defer updates
- Prevents surprises

**Cons:**
- Updates may be deferred indefinitely
- Still requires user action
- Defeats "zero maintenance" goal

#### Option: Automatic with Rollback

Worker updates automatically but allows rollback:
```bash
dust bucket worker --rollback  # Returns to previous version
```

**Pros:**
- Automatic updates with safety net
- Best of both worlds
- Reduces downtime from bad updates

**Cons:**
- More complex implementation
- Storage overhead for old versions
- May give false sense of security

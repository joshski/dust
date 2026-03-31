# Single-Line Install for Bucket Worker

Running `dust bucket worker` should be trivially simple with one command.

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

- Version is embedded at build time from `package.json` (currently 0.1.108)
- Entry point is `/lib/cli/commands/bucket-worker.ts`
- Authentication uses OAuth or `DUST_BUCKET_TOKEN` environment variable
- Credentials stored at `~/.dust/credentials.json`
- Worker connects to `wss://dustbucket.com/agent/connect` via WebSocket
- No existing auto-update mechanism

Relevant principles:
- **easy-adoption**: Dust should be trivially easy to adopt
- **batteries-included**: Dust should provide everything required
- **agent-autonomy**: Enable AI agents to produce work autonomously
- **self-contained-repository**: Developers should have everything they need within the repository

## Open Questions

### How should the installation script be distributed?

#### Option: Shell Script via HTTP

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

#### Option: Built-in Auto-Update Check

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

#### Option: Remain Runtime-Agnostic

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

#### Option: Keep Docker Optional

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

#### Option: Interactive OAuth During Install

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

#### Option: Fully Automatic Updates

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

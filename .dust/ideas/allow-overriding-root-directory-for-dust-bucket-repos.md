# Allow overriding root directory for `dust bucket` repos

Make the root directory where `dust bucket` clones repositories configurable, instead of always using the system temp directory.

## Current State

When `dust bucket` runs, it clones repositories into directories under the OS temp directory (via `tmpdir()` from `node:os`). The path for each repo is constructed by `getRepoTempPath()` in `lib/bucket/repository.ts`:

```typescript
export function getRepoTempPath(repoName: string, tempDir: string): string {
  const safeName = repoName.replace(/[^a-zA-Z0-9-_]/g, '-')
  return join(tempDir, `dust-bucket-${safeName}`)
}
```

The temp directory is provided via `BucketDependencies.getTempDir` (defined in `lib/cli/commands/bucket.ts`), which defaults to `tmpdir()`. This is already dependency-injected, making it straightforward to override.

Currently, `DUST_BUCKET_AGENT_CONNECT_URL` is the only environment variable supported by `dust bucket` (for overriding the WebSocket URL).

## Motivation

- **Persistence**: OS temp directories may be cleaned up on reboot, losing cloned repos and requiring re-cloning
- **Visibility**: A user-chosen directory like `~/dust-repos` is easier to find and inspect than a deeply nested temp path
- **Organization**: Users may want repos in a specific location alongside other project files
- **Disk management**: Temp directories may be on a smaller partition or have different performance characteristics

## Possible implementation

Override `getTempDir` in `createDefaultBucketDependencies()` to check for a configured root directory before falling back to `tmpdir()`. The `getRepoTempPath()` function already accepts the temp directory as a parameter, so no changes are needed downstream.

## Open Questions

### How should the root directory be configured?

#### Environment variable (e.g. `DUST_BUCKET_ROOT_DIR`)

Consistent with the existing `DUST_BUCKET_AGENT_CONNECT_URL` pattern. Simple and works well for per-session or per-machine configuration. No need to modify the settings file format.

#### Settings file (`.dust/config/settings.json`)

Keeps configuration centralized and version-controlled. However, `dust bucket` operates outside of a specific dust project directory, so it's unclear which `.dust/config/settings.json` would be read.

#### CLI flag (e.g. `dust bucket --root-dir /tmp/repos`)

Explicit per-invocation control. Adds complexity to the command interface and doesn't persist across runs.

### Should the directory be created automatically if it doesn't exist?

#### Yes, create it automatically

Reduces friction. The user specifies a path and it just works.

#### No, require it to exist

Prevents accidental creation of directories in unexpected locations. A clear error message if the directory doesn't exist would guide the user.

### What should happen to repo cleanup on shutdown?

Currently, `dust bucket` removes cloned repo directories on graceful shutdown. If the user has chosen a persistent root directory, should repos still be cleaned up on exit, or should they persist for faster restart?

#### Always clean up

Consistent behavior regardless of root directory. Avoids stale repos accumulating.

#### Persist repos in custom directories, clean up only in temp directories

Repos in the default temp directory are cleaned up as before, but repos in a user-specified directory are preserved. This lets users opt into persistence by setting a custom root.

#### Let the user decide via a separate flag

Add a `--persist` flag or equivalent setting. Most flexible but adds another configuration surface.

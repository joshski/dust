# Repo-aware asset uploads

The `dust bucket asset upload` command should associate uploaded assets with the repository context in which the agent is running. The repository ID should be implicitly determined from a `DUST_REPOSITORY_ID` environment variable, set by the bucket command when spawning agent processes.

## Current State

The `bucket-asset-upload.ts` command uploads files to `{DUST_BUCKET_HOST}/api/assets` with authentication but no repository context (`lib/cli/commands/bucket-asset-upload.ts:269`). The POST request includes only the authentication token and file content.

The bucket command manages repository loops via `runRepositoryLoop()` in `lib/bucket/repository-loop.ts`. Each repository has state including `repository.name` and `repository.gitUrl` (parsed from server messages in `lib/bucket/repository.ts:137-167`), but there is no `id` field currently.

The server sends a `repository-list` message with repository objects containing `name`, `gitUrl`, and optionally `url` (the web URL for the repo). No numeric or UUID-based `id` is currently part of the protocol.

## Proposed Change

1. **Server protocol change**: The dustbucket server should include a `repositoryId` (or `id`) field in repository data sent to agents.

2. **Environment variable**: When the bucket command spawns or runs agent processes, set `DUST_REPOSITORY_ID` in the environment. Since `repository-loop.ts` runs the loop in-process (not as a subprocess), this would need to be stored on `RepositoryState` and made available to commands run within that context.

3. **Asset upload command**: Modify `bucket-asset-upload.ts` to read `DUST_REPOSITORY_ID` from the environment and include it in the upload request (e.g., as a query parameter or header).

## Relevant Code

- `lib/cli/commands/bucket-asset-upload.ts` — The upload command; needs to read and send repository ID
- `lib/bucket/repository.ts:44-49` — `Repository` interface; would need `id` field
- `lib/bucket/repository.ts:137-167` — `parseRepository()` function; needs to parse `id`
- `lib/bucket/repository-loop.ts:52-254` — `runRepositoryLoop()` function; needs to expose repository context to commands
- `lib/cli/commands/bucket.ts:636-737` — WebSocket message handler that receives `repository-list`

## Related Ideas

- [Send events to dust bucket host in `dust loop`](send-events-to-dust-bucket-host-in-dust-loop.md) — Similar integration with bucket service
- [Automatically enable agent when running `dust bucket` from repo clone](automatically-enable-agent-when-running-dust-bucket-from-repo-clone.md) — Related agent-server communication

## Open Questions

### How should the repository ID be communicated to the upload command?

#### Use an environment variable (`DUST_REPOSITORY_ID`)

The bucket command sets `DUST_REPOSITORY_ID` in the environment before running agent processes. The upload command reads this directly. This is simple but requires understanding how the current in-process loop architecture would propagate environment changes to child commands.

#### Pass repository context through CommandDependencies

Extend `CommandDependencies` to include repository context. The loop sets this when building dependencies for `runOneIteration()`. This is more explicit but requires changes to the command interface.

#### Store in a process-local context file

Write repository context to a temporary file (e.g., `.dust/.context.json`) that commands can read. Avoids environment variable complexity but adds file I/O.

### Should the upload endpoint require repository ID or make it optional?

#### Require repository ID

Uploads always associate with a repository. This is cleaner for asset organization but means uploads fail if the context is missing.

#### Make repository ID optional

Allow uploads without repository context for standalone usage. Assets uploaded without context go to a "global" bucket or are associated with the user.

### What identifier format should the server use?

#### Use the existing `name` field (owner/repo format)

The server already sends `name` (e.g., `joshski/dust`). The client could send this as the repository identifier. No protocol change needed for the client; server uses name for lookup.

#### Introduce a numeric or UUID `id` field

Add an explicit `id` field to repository data. More robust to renames but requires server protocol changes.

### Should `dust loop` also support repository-aware uploads?

#### Only support in `dust bucket`

The `dust loop` command manages a single repository locally without server interaction. Repository context is implicit from the working directory.

#### Extend to `dust loop` with optional repository context

Allow `dust loop` to set repository context when the user has configured bucket integration (see [Send events to dust bucket host in `dust loop`](send-events-to-dust-bucket-host-in-dust-loop.md)).

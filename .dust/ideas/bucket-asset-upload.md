# Bucket asset upload

Upload binary assets (images, diagrams, large files) to the bucket server and receive a URL for embedding into artifacts.

## Background

Dust artifacts (principles, facts, ideas, tasks) sometimes benefit from visual content — diagrams explaining architecture, screenshots illustrating UI, or data files supporting analysis. Currently, large files committed to the repository consume space in version control, slow down clones, and bloat context windows when agents read the `.dust/` directory.

The `dust bucket` command already establishes an authenticated connection to `dustbucket.com` using credentials stored in `~/.dust/credentials.json`. A new `dust bucket asset upload` subcommand could reuse this authentication to POST binary files to the bucket server, receive a hosted URL in response, and output that URL for embedding into markdown artifacts.

## Proposed Behavior

1. **Command syntax**: `dust bucket asset upload <file-path>`

2. **Authentication**: Use the same credential resolution as `dust bucket`:
   - `DUST_BUCKET_TOKEN` env var (takes precedence)
   - Stored credential at `~/.dust/credentials.json`
   - Trigger browser auth flow if no token exists

3. **Upload flow**:
   - Read the file from disk
   - POST to bucket server endpoint (e.g., `https://dustbucket.com/assets` or `/api/assets`)
   - Server returns a public URL
   - Command outputs the URL to stdout for piping or copying

4. **Usage in artifacts**: The returned URL can be embedded in markdown:
   ```markdown
   ![Architecture diagram](https://dustbucket.com/assets/abc123.png)
   ```

## Relevant Code

- `lib/bucket/auth.ts` — `loadStoredToken()`, `storeToken()`, `authenticate()`, `getDustbucketHost()`
- `lib/cli/commands/bucket.ts` — existing `dust bucket` command; new subcommand would be added here or in a separate file
- `lib/cli/main.ts` — command registry; would add `bucket asset upload` as a multi-word command

## Principles Alignment

- [Repository Hygiene](../principles/repository-hygiene.md) — keeps large binaries out of version control
- [Context Window Efficiency](../principles/context-window-efficiency.md) — agents don't consume tokens reading base64-encoded images
- [Minimal Dependencies](../principles/minimal-dependencies.md) — reuses existing bucket auth infrastructure

## Open Questions

### Should assets be scoped to a repository or user-global?

#### Repository-scoped assets

Assets are tied to the repository context. The bucket server would need to know which repository the upload is for (could derive from current working directory or require explicit parameter). Benefits: assets can be cleaned up when a repository is removed from the bucket; natural access control if repos have different visibility.

#### User-scoped assets

Assets belong to the authenticated user regardless of repository. Simpler implementation — just POST the file with the bearer token. Drawback: no automatic cleanup; assets persist indefinitely unless manual deletion is implemented.

### What file types and size limits should be enforced?

#### Client-side validation

The CLI validates file type (e.g., images, PDFs, common formats) and size (e.g., max 10MB) before uploading. Fast feedback, prevents wasted bandwidth.

#### Server-side validation only

The server enforces limits and returns appropriate errors. Simpler client code, single source of truth for policy.

#### Both client and server validation

Client provides fast feedback; server enforces as backstop. More code but better UX.

### Should the URL be permanent or time-limited?

#### Permanent public URLs

Once uploaded, the asset is accessible indefinitely at a stable URL. Simple mental model; URLs in old artifacts keep working.

#### Time-limited signed URLs

URLs expire after a period (e.g., 30 days, 1 year). Reduces long-term storage costs; forces cleanup. Breaks old artifact references unless URLs are refreshed.

### How should name collisions be handled?

#### Generate unique IDs for all uploads

Every upload gets a UUID or hash-based filename (e.g., `abc123.png`). No collisions possible. Drawback: URLs are opaque; can't tell what the asset is from the URL.

#### Allow user-specified names with conflict detection

Users can specify a name; server rejects if it exists. More human-readable URLs but requires handling conflicts.

#### Overwrite existing assets with same name

Uploading a file with the same name replaces the old one. Useful for updating diagrams. Risk: accidental overwrites.

### Should there be a way to list or delete uploaded assets?

#### Upload-only initially

Start with just upload. Keep scope minimal. Deletion and listing can be added later if needed.

#### Full CRUD from the start

Implement `dust bucket asset list` and `dust bucket asset delete` alongside upload. More complete but larger initial scope.

### Does the bucket server already have an asset upload endpoint?

#### Endpoint already exists

If dustbucket.com already supports asset uploads, confirm the API contract and wire the CLI to it.

#### Endpoint must be added server-side

If no endpoint exists, this feature requires coordinated server-side work before the CLI changes can be completed.

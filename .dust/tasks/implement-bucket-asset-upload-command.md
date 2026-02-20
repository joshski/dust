# Implement bucket asset upload command

Add a `dust bucket asset upload <file-path>` command that uploads a binary file to the bucket server and outputs the public URL.

## Background

Dust artifacts sometimes benefit from visual content — diagrams, screenshots, or data files. Currently, large files committed to the repository consume space in version control, slow down clones, and bloat context windows. The bucket server can host these assets at permanent public (but obscure) URLs.

The existing `dust bucket` command already has authentication infrastructure that can be reused. This task adds a new subcommand that reads a file, POSTs it to the bucket server, and prints the resulting URL.

## Requirements

1. **Command syntax**: `dust bucket asset upload <file-path>`

2. **Authentication**: Reuse the same credential resolution as `dust bucket`:
   - `DUST_BUCKET_TOKEN` env var (takes precedence)
   - Stored credential at `~/.dust/credentials.json`
   - Trigger browser auth flow if no token exists

3. **Upload flow**:
   - Read the file from disk as a stream of bytes
   - POST to bucket server endpoint (e.g., `POST https://dustbucket.com/api/assets`)
   - Include `Authorization: Bearer <token>` header
   - Include `Content-Type` header based on file extension or detection
   - Server returns JSON with the public URL
   - Command outputs the URL to stdout

4. **Client-side validation** (for fast feedback):
   - Validate file exists before attempting upload
   - Validate file size (e.g., max 10MB) before upload
   - Validate file type is acceptable (images, PDFs, common formats)

5. **Error handling**:
   - Clear error message if file doesn't exist
   - Clear error message if file exceeds size limit
   - Clear error message if server returns an error

## Relevant Code

- `lib/bucket/auth.ts` — `loadStoredToken()`, `storeToken()`, `authenticate()`, `getDustbucketHost()`
- `lib/cli/commands/bucket.ts` — existing bucket command with auth dependencies
- `lib/cli/main.ts` — command registry for multi-word commands

## Design Notes

- Assets are repository-scoped (the server determines scope from the token/context)
- All uploads get unique IDs from the server; no user-specified names
- URLs are permanent and publicly accessible (but obscure)
- No list or delete functionality in this initial implementation

## Principles

- [Repository Hygiene](../principles/repository-hygiene.md)
- [Context Window Efficiency](../principles/context-window-efficiency.md)
- [Fast Feedback](../principles/fast-feedback.md)
- [Minimal Dependencies](../principles/minimal-dependencies.md)

## Blocked By

(none)

## Definition of Done

- [ ] `dust bucket asset upload <file-path>` command implemented
- [ ] Command reuses existing bucket auth infrastructure
- [ ] File is uploaded to bucket server endpoint
- [ ] Public URL is printed to stdout on success
- [ ] Client-side validation for file existence, size, and type
- [ ] Error messages are clear and actionable
- [ ] Unit tests cover the upload logic and validation
- [ ] `bin/dust check` passes

# Repo-aware asset uploads

Associate uploaded assets with the repository context in which the agent is running.

## Background

The `dust bucket asset upload` command currently uploads files without any repository context. When running agents via `dust bucket`, uploads should be associated with the repository the agent is working in.

The server protocol will include a `repositoryId` (or `id`) field in repository data. This task implements the client-side changes to:

1. Parse the `id` field from repository data received from the server
2. Propagate the repository ID to commands via the `DUST_REPOSITORY_ID` environment variable
3. Require and send the repository ID with asset uploads

## Implementation Details

### Repository interface changes

Add an optional `id` field to the `Repository` interface in `lib/bucket/repository.ts`. Update `parseRepository()` to extract this field when present.

### Environment propagation

When `runRepositoryLoop()` runs an agent iteration, set `DUST_REPOSITORY_ID` in the environment passed to the agent process. The repository ID should be available from `RepositoryState.repository.id`.

### Upload command changes

Modify `bucket-asset-upload.ts` to:
- Read `DUST_REPOSITORY_ID` from the environment
- Require the repository ID (fail with actionable error if missing)
- Include the repository ID in the upload request (as a query parameter or header)

### Error handling

When `DUST_REPOSITORY_ID` is not set, the upload command should fail with a clear, actionable error message explaining that the command must be run within a repository context (via `dust bucket`).

## Principles

- [Actionable Errors](../principles/actionable-errors.md)
- [Dependency Injection](../principles/dependency-injection.md)
- [Comprehensive Test Coverage](../principles/comprehensive-test-coverage.md)

## Blocked By

(none)

## Definition of Done

- [ ] `Repository` interface includes optional `id` field
- [ ] `parseRepository()` extracts `id` from server data when present
- [ ] `DUST_REPOSITORY_ID` is set in environment when running agent iterations
- [ ] `bucket-asset-upload` reads `DUST_REPOSITORY_ID` and sends with uploads
- [ ] Upload fails with actionable error when repository ID is missing
- [ ] Tests cover the new behavior
- [ ] `bucket-asset-upload.md` fact is updated to document the repository ID requirement

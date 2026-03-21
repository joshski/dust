# Export artifact path prefix helper

Dustbucket's `artifact-paths.ts` has an `artifactPathPrefix(type)` function that returns `.dust/{type}/` (e.g. `.dust/tasks/`). Dust already exports `DUST_PATH_PREFIX` (`.dust/`) and `parseArtifactPath()`, but doesn't have a helper for generating the type-specific prefix.

Adding `artifactPathPrefix(type: ArtifactType): string` to `@joshski/dust/artifacts` would let dustbucket drop its local implementation and use dust as the single source of truth for all path conventions.

This is a ~3 line function. Dustbucket uses it for filtering file paths by artifact type (e.g. in webhook handlers to detect which artifact types changed in a push).

## Open Questions

### Where should this be exported from?

#### Option: Add to `@joshski/dust/artifacts` alongside `DUST_PATH_PREFIX` and `parseArtifactPath`

Keeps all path utilities together in one import. Consistent with where the other path helpers live.

#### Option: Just document that consumers can do `DUST_PATH_PREFIX + type + '/'`

It's a trivial concatenation. Maybe not worth adding API surface for.

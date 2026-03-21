# Dustbucket migration to dust path APIs

Dustbucket's `src/lib/artifact-paths.ts` duplicates path utilities that dust already provides.

- `dustPathPrefix()` → use `DUST_PATH_PREFIX` from `@joshski/dust/artifacts`
- `parseArtifactPath()` → use `parseArtifactPath()` from `@joshski/dust/artifacts`
- `artifactPath()` → use `ArtifactsRepository.artifactPath()` from `@joshski/dust/artifacts`

Similarly, `extractTitleFromContent()` in `push.pure.ts` duplicates dust's `extractTitle()`.

The only dustbucket-specific function is `artifactPathLikePattern()` (SQL LIKE patterns), which should stay local.

This idea is about tracking the awareness that most of the work identified in dustbucket's "push artifact format awareness down to dust" idea is actually already done — the remaining work is mostly on the dustbucket side to switch to using dust's existing exports.

## What dust might still need

- `artifactPathPrefix(type)` helper (see separate idea)
- Exported `extractParentSlug` (see separate idea)

Everything else is ready for dustbucket to consume today.

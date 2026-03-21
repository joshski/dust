# Export extract parent slug for principles

Dust has internal logic for extracting parent principle slugs but doesn't export it. Dustbucket's `dust-file-cache.ts` has its own `extractParentSlug(content)` function that duplicates this, and dust's `extractSingleLinkFromSection()` in `lib/artifacts/principles.ts` is not exported from `@joshski/dust/artifacts`.

Dustbucket's version also handles the "none (top-level)" case explicitly, which may or may not be needed.

The simplest path would be to export a `extractParentSlug(content: string): string | null` from `@joshski/dust/artifacts` — either by wrapping `extractSingleLinkFromSection` or by exporting the parsing function directly.

## Open Questions

### Is this actually needed given `parsePrinciple` exists?

#### Option: Just use `parsePrinciple()` which already returns `parentPrinciple: string | null`

Dustbucket could call `parsePrinciple()` on the content instead of using a standalone extraction function. This already works via `ReadOnlyArtifactsRepository`. The downside is it requires a repository instance and reads from the filesystem rather than parsing a string directly.

#### Option: Export a standalone `extractParentSlug` that works on raw content

Useful when dustbucket already has the content in memory (e.g. from a GitHub webhook payload or file cache) and just needs the parent slug without constructing a repository.

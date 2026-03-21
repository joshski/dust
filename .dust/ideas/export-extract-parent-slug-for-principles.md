# Export extractParentSlug for principles

Dustbucket's `dust-file-cache.ts` has an `extractParentSlug(content: string)` function that extracts the parent principle slug from a principle's markdown content. Dust already has equivalent logic internally in `extractSingleLinkFromSection()` (in `lib/artifacts/principles.ts`), but this function is not exported from the `@joshski/dust/artifacts` entry point.

Dustbucket's version also handles the "none (top-level)" case explicitly, which may or may not be needed.

The simplest path would be to export a `extractParentSlug(content: string): string | null` from `@joshski/dust/artifacts` — either by wrapping `extractSingleLinkFromSection` or by exporting the parsing function directly.

## Open Questions

### Is this actually needed given `parsePrinciple` exists?

#### Option: Just use `parsePrinciple()` which already returns `parentPrinciple: string | null`

Dustbucket could call `parsePrinciple()` on the content instead of using a standalone extraction function. This already works via `ReadOnlyArtifactsRepository`. The downside is it requires a repository instance and reads from the filesystem rather than parsing a string directly.

#### Option: Export a standalone `extractParentSlug` that works on raw content

Useful when dustbucket already has the content in memory (e.g. from a GitHub webhook payload or file cache) and just needs the parent slug without constructing a repository.

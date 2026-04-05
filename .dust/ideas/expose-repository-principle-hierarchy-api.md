# Expose repository principle hierarchy API

Dust already exports `getCorePrincipleHierarchy()` from `@joshski/dust/core-principles` for reading bundled core principles. However, there is no equivalent public API for reading a repository's local principles from `.dust/principles/`. The CLI has hierarchy-building logic in `lib/cli/commands/list.ts` via `buildPrincipleHierarchy()`, but this function is not exported and uses file paths rather than slugs, making it unsuitable for library consumers.

## Current Landscape

### What Exists Today

**Core Principles API** (`@joshski/dust/core-principles`):
- `getCorePrincipleHierarchy(config?)` returns `CorePrincipleNode[]` tree structure
- `CorePrincipleNode` shape: `{ slug: string, title: string, children: CorePrincipleNode[] }`
- Works entirely from bundled JavaScript (no filesystem access)
- Supports filtering via `CorePrinciplesConfig` with `excludeCorePrinciples` array

**CLI Implementation** (`lib/cli/commands/list.ts`):
- `buildPrincipleHierarchy(principlesPath, fileSystem)` builds local hierarchy
- Returns `PrincipleNode[]` with shape: `{ filePath: string, title: string, children: PrincipleNode[] }`
- Uses file paths instead of slugs (inconsistent with core principles API)
- Calls `extractPrincipleRelationships()` from validation module
- Not exported from any public entry point

**Artifacts Repository** (`@joshski/dust/artifacts`):
- `parsePrinciple({ slug })` reads and parses individual principles
- `listPrinciples()` returns array of slugs
- No hierarchy-building functionality

### Implementation Components

The hierarchy-building algorithm exists in two places:

1. **Core principles**: `lib/artifacts/core-principles.ts` exports `getCorePrincipleTree(allPrinciples, config)` which:
   - Filters principles by exclusion list and "Internal" marker
   - Creates nodes keyed by slug
   - Wires parent-child relationships
   - Returns root nodes (those with no parent or filtered parent)
   - Recursively sorts alphabetically by title

2. **Local principles (CLI only)**: `lib/cli/commands/list.ts` has `buildPrincipleHierarchy()` which:
   - Reads all `.md` files from principles directory
   - Parses each using `extractPrincipleRelationships()`
   - Maps file paths to relationships and titles
   - Finds roots (principles with empty `parentPrinciples` array)
   - Recursively builds tree with file paths as identifiers

The validation module `lib/lint/validators/principle-hierarchy.ts` provides `extractPrincipleRelationships(artifact)` which returns `PrincipleRelationships` containing `{ filePath, parentPrinciples, subPrinciples }` arrays of file paths.

## Proposed API

Export a new function from `@joshski/dust/artifacts`:

```typescript
export interface RepositoryPrincipleNode {
  slug: string
  title: string
  children: RepositoryPrincipleNode[]
}

export async function getRepositoryPrincipleHierarchy(
  repository: ReadOnlyArtifactsRepository
): Promise<RepositoryPrincipleNode[]>
```

This mirrors the shape and naming of `getCorePrincipleHierarchy()` from the core-principles export but operates on repository data rather than bundled data.

### Alternative Signatures

The function could accept either a repository instance or raw filesystem parameters:

**Option A: Repository-based** (recommended)
```typescript
getRepositoryPrincipleHierarchy(repository: ReadOnlyArtifactsRepository)
```
- Cleanest API surface
- Reuses existing repository abstraction
- Consistent with how other artifact operations work

**Option B: Filesystem-based**
```typescript
getRepositoryPrincipleHierarchy(fileSystem: ReadableFileSystem, dustPath: string)
```
- More flexible for consumers who don't have a repository instance
- Matches the pattern of functions like `validatePatch(fileSystem, dustPath, patch)`
- Could construct repository internally

**Option C: Overloaded**
```typescript
getRepositoryPrincipleHierarchy(
  repositoryOrFileSystem: ReadOnlyArtifactsRepository | ReadableFileSystem,
  dustPath?: string
)
```
- Most flexible but more complex API

## Implementation Strategy

### Approach 1: Refactor and Share Tree-Building Logic

Extract the pure tree-building algorithm from `getCorePrincipleTree()` into a shared helper:

```typescript
// Internal helper
function buildPrincipleTree<T extends { slug: string, title: string }>(
  principles: (T & { parentPrinciple: string | null, subPrinciples: string[] })[],
  filterFn?: (principle: T) => boolean
): { slug: string, title: string, children: any[] }[]
```

Then both `getCorePrincipleTree()` and the new `getRepositoryPrincipleHierarchy()` could use this shared implementation, ensuring consistency.

### Approach 2: Dedicated Implementation

Write a focused implementation for repository principles that:
1. Calls `repository.listPrinciples()` to get all slugs
2. For each slug, calls `repository.parsePrinciple({ slug })` to get `Principle` data
3. Builds node map keyed by slug
4. Wires parent-child relationships from `parentPrinciple` and `subPrinciples` fields
5. Returns roots (principles with `parentPrinciple === null`)
6. Recursively sorts alphabetically by title

This approach avoids changing existing code and keeps repository logic separate from core principles logic.

### Approach 3: Convert CLI to Use New API

After implementing the public API, refactor `buildPrincipleHierarchy()` in the CLI to use it:
- Call `getRepositoryPrincipleHierarchy(repository)`
- Convert returned nodes to `PrincipleNode` format with file paths if needed
- Or change CLI rendering to accept slug-based nodes

This validates the API is sufficient for internal use and reduces duplication.

## Error Handling

The function should handle common error cases with actionable messages:

1. **Missing principle file**: If a parent or sub-principle slug is referenced but the file doesn't exist, throw an error like:
   ```
   Principle 'child-principle' references parent 'missing-parent' which does not exist in .dust/principles/
   ```

2. **Circular references**: If validation has been bypassed and cycles exist, detect and report:
   ```
   Circular reference detected in principle hierarchy: parent-a -> child-b -> parent-a
   ```

3. **Malformed principle**: If `parsePrinciple()` fails, let the underlying error propagate with context

4. **Empty repository**: If no principles exist, return empty array `[]` (not an error)

## Testing Strategy

### Unit Tests

Add tests in a new file `lib/artifacts/repository-principle-hierarchy.test.ts`:

1. **Basic hierarchy**: Repository with clear parent-child relationships, verify tree structure
2. **Multiple roots**: Principles with `parentPrinciple: null`, verify all appear at root level
3. **Deep nesting**: 4+ levels deep, verify recursive structure
4. **Alphabetical sorting**: Verify children sorted by title
5. **Missing parent reference**: Principle references non-existent parent, verify error
6. **Empty repository**: No principles, verify returns `[]`
7. **Orphaned principles**: Principles whose parents exist but don't list them as children (validation prevents this in practice, but API should handle it)

### Integration with Existing Tests

Update CLI tests in `lib/cli/commands/list.test.ts` to ensure `dust principles --tree` still works if we refactor to use the new API.

## Documentation Requirements

1. **JSDoc comments** on the exported function explaining:
   - What it returns (tree of root principles)
   - Node structure (`RepositoryPrincipleNode`)
   - Sorting behavior (alphabetical by title)
   - Error cases

2. **Update package exports fact** (`.dust/facts/package-exports.md`) to document the new function

3. **Type exports**: Add `RepositoryPrincipleNode` to `@joshski/dust/types` if we consolidate types there, or export from `@joshski/dust/artifacts`

## Related Ideas and Context

- **Export extract parent slug for principles** (`.dust/ideas/export-extract-parent-slug-for-principles.md`): Related idea to export `extractParentSlug()` for parsing parent relationships from raw content
- **Expose more types** (`.dust/ideas/expose-more-types.md`): Related idea about expanding type exports
- **Principle Hierarchy Design** (`.dust/facts/principle-hierarchy-design.md`): Documents the single-parent tree structure and markdown format

## Principles Applied

- **Decoupled Code**: Separate hierarchy-building logic from CLI rendering
- **Design for Testability**: Pure function that takes repository interface
- **Functional Core, Imperative Shell**: Pure tree-building logic, filesystem I/O at edges
- **Actionable Errors**: Error messages guide users to fix invalid references
- **Reasonably DRY**: Share tree-building logic between core and repository APIs where practical
- **Context Window Efficiency**: Small, focused API surface

## Research Findings

### Current Implementation Analysis

**Core Principles Tree Building** (`lib/artifacts/core-principles.ts:84-126`):
- `getCorePrincipleTree()` is a pure function that filters and builds hierarchy
- Algorithm: create node map → wire parent-child → find roots → sort recursively
- Returns `CorePrincipleNode[]` with `{ slug, title, children }` shape
- Filtering excludes Internal principles and user-specified exclusions

**Repository Principle Parsing** (`lib/artifacts/index.ts:202-215`):
- `repository.listPrinciples()` reads `.dust/principles/` directory
- `repository.parsePrinciple({ slug })` returns full `Principle` object
- `Principle` type includes `parentPrinciple`, `subPrinciples`, `title`, `slug`, `content`

**CLI Implementation** (`lib/cli/commands/list.ts:179-231`):
- `buildPrincipleHierarchy()` is CLI-specific, uses file paths instead of slugs
- Returns `PrincipleNode[]` with `{ filePath, title, children }` shape
- Not exported, not suitable for library consumers
- Uses `extractPrincipleRelationships()` from validation module

**Key Insight**: The core tree-building logic in `getCorePrincipleTree()` is generic enough to be reused. The main difference is data source (bundled vs filesystem) and identifier type (slugs vs file paths).

### Alignment with Principles

**Decoupled Code**: New API keeps repository operations separate from CLI rendering

**Reasonably DRY**: Consider extracting shared tree-building logic rather than duplicating

**Design for Testability**: Pure function taking repository interface is easily testable

**Context Window Efficiency**: Small, focused API surface minimizes cognitive load

**Progressive Disclosure**: Returns minimal node structure; consumers request full content if needed

### Design Decision: Combined vs Separate API

The related task "Refine Idea: Expose repository principle hierarchy API" states: "We want downstream repositories to see the same data (programmatically) as they see when running `dust principles` in a single call to the API - that is a hierarchical summary of 1) the principles in the repository itself and 2) the dust core principles."

This suggests a **combined API** that returns both core and repository principles together, whereas the current idea proposes a **separate API** for repository principles only (mirroring `getCorePrincipleHierarchy()`).

**Implications**:
- Combined API would need to merge two hierarchies with potentially different roots
- CLI currently renders core and local separately (lines 448-463 in list.ts)
- No obvious way to merge two separate trees without creating an artificial root
- Alternatively: return `{ core: CorePrincipleNode[], local: RepositoryPrincipleNode[] }`

This is captured as a key open question below.

## Open Questions

### Should the API return combined or separate hierarchies?

#### Option: Combined hierarchy in a single array

```typescript
export async function getPrincipleHierarchy(
  repository: ReadOnlyArtifactsRepository,
  config?: CorePrinciplesConfig
): Promise<PrincipleNode[]>
```

Returns a merged tree combining core and repository principles. This matches the task description's requirement for "seeing the same data as `dust principles` in a single call."

**Challenges**:
- Core and repository principles have separate root nodes
- No natural way to merge without creating an artificial container
- Would require deciding precedence when core and local principles have same slug

#### Option: Separate hierarchies in structured response

```typescript
export interface CombinedPrincipleHierarchy {
  core: CorePrincipleNode[]
  local: RepositoryPrincipleNode[]
}

export async function getPrincipleHierarchy(
  repository: ReadOnlyArtifactsRepository,
  config?: CorePrinciplesConfig
): Promise<CombinedPrincipleHierarchy>
```

Returns both hierarchies in a structured object. This matches how the CLI renders them (separately) and avoids merging complexity.

**Benefits**:
- Clear separation between core and local principles
- Matches current CLI rendering behavior
- No ambiguity about which principle comes from where
- Consumers can choose to merge or keep separate

#### Option: Repository-only API (original proposal)

```typescript
export async function getRepositoryPrincipleHierarchy(
  repository: ReadOnlyArtifactsRepository
): Promise<RepositoryPrincipleNode[]>
```

Returns only repository principles. Consumers wanting both would call `getCorePrincipleHierarchy()` and `getRepositoryPrincipleHierarchy()` separately.

**Benefits**:
- Simpler, more focused API
- Mirrors existing `getCorePrincipleHierarchy()` pattern
- No merging complexity

**Drawback**: Doesn't meet the task description's requirement for "a single call"

### Should this support filtering like `getCorePrincipleHierarchy()` does?

#### Option: Add filtering configuration parameter

```typescript
interface RepositoryPrincipleConfig {
  excludePrinciples?: string[]
}

getRepositoryPrincipleHierarchy(
  repository: ReadOnlyArtifactsRepository,
  config?: RepositoryPrincipleConfig
)
```

This would mirror the core principles API and allow consumers to filter out specific principles (e.g., internal-only or deprecated ones). Implementation would be straightforward: filter the principle list before building the tree.

#### Option: No filtering, keep API minimal

Repository principles are user-controlled and there's no "Internal" concept like core principles have. Consumers can filter the returned tree themselves if needed. Simpler API surface.

### Should the node structure include full principle content?

#### Option: Minimal node (slug + title only)

```typescript
interface RepositoryPrincipleNode {
  slug: string
  title: string
  children: RepositoryPrincipleNode[]
}
```

Matches `CorePrincipleNode` exactly. Consumers call `parsePrinciple()` if they need full content. Keeps tree structure lightweight.

#### Option: Include full principle data

```typescript
interface RepositoryPrincipleNode {
  slug: string
  title: string
  content: string  // full markdown
  parentPrinciple: string | null
  subPrinciples: string[]
  children: RepositoryPrincipleNode[]
}
```

Provides complete data in one call, avoiding N additional reads. But duplicates parent/child info (once in `children` array, once in `subPrinciples`). Larger return value.

#### Option: Hybrid approach

```typescript
interface RepositoryPrincipleNode {
  slug: string
  title: string
  children: RepositoryPrincipleNode[]
  // Optionally include body excerpt or summary?
}
```

Middle ground: include title and structural info, but omit full content and relationship arrays.

### Where should this be exported from?

#### Option: Export from `@joshski/dust/artifacts` alongside repository functions

Makes sense since it operates on `ReadOnlyArtifactsRepository`. Keeps all repository operations together. Consistent with where `buildArtifactsRepository()` lives.

#### Option: Create new `@joshski/dust/principles` entry point

Dedicated entry point for principle-related utilities. Could export both core and repository hierarchy functions. Clearer separation of concerns. Might grow to include other principle utilities in the future.

#### Option: Export from existing `@joshski/dust/core-principles` as a companion

Name it `getLocalPrincipleHierarchy()` or `getRepositoryPrincipleHierarchy()` and export from same module as `getCorePrincipleHierarchy()`. Consumers import all principle hierarchy functions from one place.

### Should this replace or wrap the CLI's `buildPrincipleHierarchy()`?

#### Option: Replace CLI implementation with new public API

Refactor `lib/cli/commands/list.ts` to call the new public function. Eliminates duplication. Validates the API meets internal needs. Reduces maintenance burden. May require converting file paths to slugs or vice versa.

#### Option: Keep CLI implementation separate

The CLI's needs (file paths, specific rendering) may be different enough that sharing code creates unnecessary coupling. Leave CLI as-is, export new API for external consumers.

### Should we handle repositories with no `.dust/principles/` directory?

#### Option: Return empty array for missing directory

Treat missing directory same as empty directory. Simple and unsurprising. Repositories may not have any local principles (relying entirely on core principles).

#### Option: Throw error for missing directory

Signal that the repository isn't properly initialized. But this may be overly strict—not all repositories need local principles.

### Should sorting be configurable?

#### Option: Always sort alphabetically (current behavior)

Consistent with `getCorePrincipleTree()`. Predictable output. Simplest implementation.

#### Option: Support sort options

```typescript
interface RepositoryPrincipleConfig {
  sort?: 'alpha' | 'none'
}
```

Allow consumers to preserve definition order or apply custom sorting. More flexible but adds complexity.

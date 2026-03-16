# Extract Shared Repository Implementation

Eliminate ~200 lines of duplicated code between `buildArtifactsRepository` and `buildReadOnlyArtifactsRepository` in `lib/artifacts/index.ts`.

## Current State

The file contains two repository builders with nearly identical implementations:

- `buildArtifactsRepository` (lines 118-294): Full read-write repository
- `buildReadOnlyArtifactsRepository` (lines 296-422): Read-only subset

Both share:
- `artifactPath()` implementation
- `parseIdea()` implementation
- `listIdeas()` implementation
- `listPrinciples()` implementation
- `listFacts()` implementation
- `listTasks()` implementation
- `parseTask()` implementation
- Path calculation logic
- Error handling patterns

The only difference is that the read-write version includes mutation methods (`createRefineIdeaTask`, `createDecomposeIdeaTask`, etc.).

## Proposed Refactoring

Extract shared read operations into a base implementation using composition:

```typescript
function buildReadOperations(fileSystem: FileSystem, dustPath: string) {
  return {
    artifactPath(type: ArtifactType, slug: string): string {
      return `${dustPath}/${type}/${slug}.md`
    },
    async parseIdea(options: { slug: string }): Promise<Idea> {
      return parseIdeaImpl(fileSystem, dustPath, options.slug)
    },
    // ... other read operations
  }
}

export function buildArtifactsRepository(
  fileSystem: FileSystem,
  dustPath: string
): ArtifactsRepository {
  return {
    ...buildReadOperations(fileSystem, dustPath),
    // write operations
  }
}

export function buildReadOnlyArtifactsRepository(
  fileSystem: FileSystem,
  dustPath: string
): ReadOnlyArtifactsRepository {
  return buildReadOperations(fileSystem, dustPath)
}
```

## Trade-offs

### Benefits

- Reduces ~200 lines of duplication
- Single source of truth for read operation implementations
- Bug fixes apply to both repository types automatically
- Aligns with [Reasonably DRY](../principles/reasonably-dry.md) principle
- Easier to maintain consistency between read-only and read-write variants

### Costs

- Adds one level of indirection
- Slightly more complex mental model (composition vs. direct implementation)
- Need to ensure TypeScript correctly infers return types

## Open Questions

### Should this use composition or inheritance?

#### Option: Composition with spread

Use object spread to combine read operations with write operations. Simpler, no class hierarchy, aligns with functional style.

#### Option: Class inheritance

Create a base class with read methods, extend for read-write variant. More traditional OOP approach, clearer in some IDEs.

### Should the interface types also be unified?

#### Option: Separate interfaces, shared implementation

Keep `ArtifactsRepository` and `ReadOnlyArtifactsRepository` as separate interfaces. Implementation shares code but types remain distinct.

#### Option: Extend interface

Have `ArtifactsRepository extends ReadOnlyArtifactsRepository`. Clearer type relationship, allows accepting read-only where full repository is provided.

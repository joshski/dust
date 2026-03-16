# Extract Shared Repository Read Operations

Extract shared read operations from `buildArtifactsRepository` and `buildReadOnlyArtifactsRepository` in `lib/artifacts/index.ts`. This eliminates ~200 lines of duplicated code using a composable helper function.

## Context

The file contains two repository builders with nearly identical implementations of 12 read-only methods:
- `artifactPath()`, `parseIdea()`, `listIdeas()`
- `parsePrinciple()`, `listPrinciples()`
- `parseFact()`, `listFacts()`
- `parseTask()`, `listTasks()`
- `findWorkflowTaskForIdea()`, `parseCaptureIdeaTask()`, `buildTaskGraph()`

The only difference is that `buildArtifactsRepository` adds mutation methods (`createRefineIdeaTask`, `createDecomposeIdeaTask`, etc.).

## Approach

Use **composition with spread** to extract shared read operations:

```typescript
function buildReadOperations(fileSystem: ReadableFileSystem, dustPath: string) {
  return {
    artifactPath(type: ArtifactType, slug: string): string {
      return `${dustPath}/${type}/${slug}.md`
    },
    async parseIdea(options: { slug: string }): Promise<Idea> {
      return parseIdeaImpl(fileSystem, dustPath, options.slug)
    },
    // ... all other read operations
  }
}

export function buildArtifactsRepository(
  fileSystem: FileSystem,
  dustPath: string
): ArtifactsRepository {
  return {
    ...buildReadOperations(fileSystem, dustPath),
    // write operations only
  }
}

export function buildReadOnlyArtifactsRepository(
  fileSystem: ReadableFileSystem,
  dustPath: string
): ReadOnlyArtifactsRepository {
  return buildReadOperations(fileSystem, dustPath)
}
```

Keep `ArtifactsRepository` and `ReadOnlyArtifactsRepository` as separate interfaces (shared implementation, distinct types).

## Principles

- [Reasonably DRY](../principles/reasonably-dry.md) - This duplication is truly about the same concept and has proven stable
- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md) - The extracted read operations are pure (aside from I/O through the injected filesystem)

## Blocked By

(none)

## Definition of Done

- [ ] `buildReadOperations` helper extracts the 12 shared methods
- [ ] `buildArtifactsRepository` uses spread to compose read + write operations
- [ ] `buildReadOnlyArtifactsRepository` returns only read operations
- [ ] Interfaces remain separate (`ArtifactsRepository` and `ReadOnlyArtifactsRepository`)
- [ ] All existing tests pass
- [ ] `bin/dust check` passes

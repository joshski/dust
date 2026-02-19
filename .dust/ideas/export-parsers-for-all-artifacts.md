# Export parsers for all artifacts

Consolidate idea and workflow-task exports into a single `@joshski/dust/artifacts` module with a repository pattern.

## Current State

The codebase has:
- **Ideas**: Full parser (`lib/ideas.ts`) with `Idea` interface and `parseIdea(fileSystem, dustPath, slug)` exported via `./ideas`
- **Workflow Tasks**: Creation functions in `lib/workflow-tasks.ts` exported via `./workflow-tasks` with separate positional arguments

Both modules require `fileSystem` and `dustPath` to be passed to each function call. The workflow task creation functions use a mix of positional arguments and options objects.

## Proposed Design

Create `lib/artifacts.ts` exporting:

```typescript
interface ArtifactsRepository {
  // Reading
  parseIdea(options: { slug: string }): Promise<Idea>
  listIdeas(): Promise<string[]>

  // Creating workflow tasks
  createRefineIdeaTask(options: { ideaSlug: string; description?: string }): Promise<CreateIdeaTransitionTaskResult>
  createDecomposeIdeaTask(options: DecomposeIdeaOptions): Promise<CreateIdeaTransitionTaskResult>
  createShelveIdeaTask(options: { ideaSlug: string; description?: string }): Promise<CreateIdeaTransitionTaskResult>
  createCaptureIdeaTask(options: { title: string; description: string; buildItNow?: boolean }): Promise<CreateIdeaTransitionTaskResult>

  // Querying
  findWorkflowTaskForIdea(options: { ideaSlug: string }): Promise<WorkflowTaskMatch | null>
  parseCaptureIdeaTask(options: { taskSlug: string }): Promise<ParsedCaptureIdeaTask | null>
}

function buildArtifactsRepository(fileSystem: FileSystem, dustPath: string): ArtifactsRepository
```

This pattern:
- Binds `fileSystem` and `dustPath` once at construction
- Uses strongly-typed options objects for all methods (one object argument each)
- Combines reading and writing operations under one interface

## Migration Path

1. Create new `lib/artifacts.ts` that wraps existing functions
2. Add `./artifacts` export to `package.json`
3. Deprecate `./ideas` and `./workflow-tasks` exports (or keep for backwards compatibility)
4. Re-export types (`Idea`, `IdeaOpenQuestion`, etc.) from artifacts module

## Open Questions

### Should the existing exports be deprecated or removed?

#### Keep existing exports (backwards compatible)

Maintain `./ideas` and `./workflow-tasks` exports alongside the new `./artifacts` export. Consumers can migrate at their own pace.

#### Remove existing exports (breaking change)

Remove `./ideas` and `./workflow-tasks` to avoid having multiple ways to do the same thing. Forces consumers to update.

### Should parsers for all artifact types be added?

#### Add parsers for principles, facts, and tasks

Expand the repository to include:
- `parsePrinciple(options: { slug: string }): Promise<Principle>`
- `parseFact(options: { slug: string }): Promise<Fact>`
- `parseTask(options: { slug: string }): Promise<Task>`

This fulfills the original idea scope and provides a complete artifact API.

#### Ideas only (minimal scope)

Only expose idea parsing since that's what exists today. Add other parsers incrementally when there's a concrete use case.

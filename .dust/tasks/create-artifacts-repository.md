# Create Artifacts Repository

Create `lib/artifacts.ts` with a repository pattern that binds `fileSystem` and `dustPath` once at construction. Migrate existing idea parsing and workflow task functions to use the repository pattern with options objects.

## Implementation Notes

- Create `buildArtifactsRepository(fileSystem, dustPath)` factory function
- Add `parseIdea(options: { slug: string })` method wrapping existing `parseIdea`
- Add `listIdeas()` method returning idea slugs
- Add workflow task methods with options objects:
  - `createRefineIdeaTask(options: { ideaSlug: string; description?: string })`
  - `createDecomposeIdeaTask(options: DecomposeIdeaOptions)`
  - `createShelveIdeaTask(options: { ideaSlug: string; description?: string })`
  - `createCaptureIdeaTask(options: { title: string; description: string; buildItNow?: boolean })`
  - `findWorkflowTaskForIdea(options: { ideaSlug: string })`
  - `parseCaptureIdeaTask(options: { taskSlug: string })`
- Re-export types (`Idea`, `IdeaOpenQuestion`, etc.) from artifacts module
- Add `./artifacts` export to `package.json` and build step
- Keep existing `./ideas` and `./workflow-tasks` exports (will be removed in later task)

## Principles

- [Small Units](../principles/small-units.md) - Repository provides small, focused methods
- [Decoupled Code](../principles/decoupled-code.md) - FileSystem dependency injection via factory

## Blocked By

(none)

## Definition of Done

- [ ] `lib/artifacts.ts` exports `buildArtifactsRepository` factory function
- [ ] Repository includes all methods for ideas and workflow tasks
- [ ] Types are re-exported from artifacts module
- [ ] `./artifacts` export added to package.json
- [ ] Build step compiles artifacts.ts
- [ ] Tests cover repository wrapper functionality

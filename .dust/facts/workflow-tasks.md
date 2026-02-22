# Workflow Tasks

`lib/artifacts/index.ts` provides a repository pattern for working with dust artifacts (ideas and workflow tasks). Use `buildArtifactsRepository(fileSystem, dustPath)` to create a repository instance that encapsulates the file system and dust path.

## Repository Methods

- `parseIdea({ slug })` - Parses an idea file and returns an `Idea` object
- `listIdeas()` - Returns slugs of all ideas
- `createRefineIdeaTask({ ideaSlug, description? })` - Creates a task to research and refine an idea
- `createDecomposeIdeaTask({ ideaSlug, description?, openQuestionResponses? })` - Creates a task to convert an idea into concrete tasks
- `createShelveIdeaTask({ ideaSlug, description? })` - Creates a task to archive and remove an idea
- `createCaptureIdeaTask({ title, description, buildItNow? })` - Creates a task to capture a new idea
- `findWorkflowTaskForIdea({ ideaSlug })` - Returns `null` or a `WorkflowTaskMatch` indicating the existing workflow task for an idea
- `parseCaptureIdeaTask({ taskSlug })` - Parses a capture-idea task file

For read-only operations, use `buildReadOnlyArtifactsRepository(fileSystem, dustPath)` which provides all parsing and listing methods (`parseIdea`, `listIdeas`, `parsePrinciple`, `listPrinciples`, `parseFact`, `listFacts`, `parseTask`, `listTasks`) plus `findWorkflowTaskForIdea` and `parseCaptureIdeaTask`.

## Idea Transition Prefixes

Tasks that transition existing ideas use title prefixes defined in `IDEA_TRANSITION_PREFIXES`:

- `Refine Idea: <Idea Title>`
- `Decompose Idea: <Idea Title>`
- `Shelve Idea: <Idea Title>`

## Filename Derivation

The `titleToFilename` function strips the colon from the prefix, producing predictable slugs:

- `Refine Idea: Foo Bar` -> `refine-idea-foo-bar.md`
- `Decompose Idea: Foo Bar` -> `decompose-idea-foo-bar.md`
- `Shelve Idea: Foo Bar` -> `shelve-idea-foo-bar.md`

## Finding Existing Workflow Tasks

`findWorkflowTaskForIdea` scans all task files for body sections that link to the target idea. The operation-specific sections are `## Refines Idea`, `## Decomposes Idea`, and `## Shelves Idea`. Returns a `WorkflowTaskMatch` with `type` (`'refine' | 'decompose-idea' | 'shelve'`), `ideaSlug`, and `taskSlug` (the task filename without `.md`) — or `null` if no workflow task exists.

Tasks must include the body section to be associated with an idea. If a task has a matching title prefix but no body section, it is not considered associated with any idea.

## Linter Validation

The linter validates:

1. The idea title after the prefix corresponds to an existing idea file in `.dust/ideas/`
2. Workflow tasks include the required body section (`## Refines Idea`, `## Decomposes Idea`, or `## Shelves Idea`)
3. The body section contains a markdown link to an existing idea file

`IDEA_TRANSITION_PREFIXES` and `titleToFilename` are defined in `lib/artifacts/workflow-tasks.ts` and imported by `lib/lint/validators/idea-validator.ts` for linter use.

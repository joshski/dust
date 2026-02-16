# Workflow Tasks

`lib/workflow-tasks.ts` provides functions for creating task files that trigger idea lifecycle transitions.

## Exported Functions

- `createRefineIdeaTask(fileSystem, dustPath, ideaSlug, description?)` - Creates a task to research and refine an idea
- `decomposeIdea(fileSystem, dustPath, options)` - Creates a task to convert an idea into a concrete task. `options` is a `DecomposeIdeaOptions` object with `ideaSlug`, optional `description`, and optional `openQuestionResponses`
- `createShelveIdeaTask(fileSystem, dustPath, ideaSlug, description?)` - Creates a task to archive and remove an idea
- `createCaptureIdeaTask(fileSystem, dustPath, options)` - Creates a task to capture a new idea (no existing idea required). `options` is `{ title: string; description: string; buildItNow?: boolean }`
- `findWorkflowTaskForIdea(fileSystem, dustPath, ideaSlug)` - Returns `null` or a `WorkflowTaskMatch` (`{ type, ideaSlug, taskSlug }`) indicating the existing workflow task for an idea

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

`findWorkflowTaskForIdea` reads the idea title, computes each possible task filename, and checks for existence. Returns a `WorkflowTaskMatch` with `type` (`'refine' | 'decompose-idea' | 'shelve'`), `ideaSlug`, and `taskSlug` (the task filename without `.md`) — or `null` if no workflow task exists.

## Linter Validation

The linter validates that the idea title after the prefix corresponds to an existing idea file in `.dust/ideas/`. `IDEA_TRANSITION_PREFIXES` and `titleToFilename` are defined in `lib/workflow-tasks.ts` and re-exported from `lint-markdown.ts` for external tool use.

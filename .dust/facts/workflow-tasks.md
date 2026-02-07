# Workflow Tasks

`lib/workflow-tasks.ts` provides functions for creating task files that trigger idea lifecycle transitions.

## Exported Functions

- `createRefineIdeaTask(fileSystem, dustPath, ideaSlug, description?)` - Creates a task to research and refine an idea
- `createTaskFromIdea(fileSystem, dustPath, ideaSlug, description?)` - Creates a task to convert an idea into a concrete task
- `createShelveIdeaTask(fileSystem, dustPath, ideaSlug, description?)` - Creates a task to archive and remove an idea
- `createCaptureIdeaTask(fileSystem, dustPath, description)` - Creates a task to capture a new idea (no existing idea required)

## Idea Transition Prefixes

Tasks that transition existing ideas use title prefixes defined in `IDEA_TRANSITION_PREFIXES`:

- `Refine Idea: <Idea Title>`
- `Create Task From Idea: <Idea Title>`
- `Shelve Idea: <Idea Title>`

## Filename Derivation

The `titleToFilename` function strips the colon from the prefix, producing predictable slugs:

- `Refine Idea: Foo Bar` -> `refine-idea-foo-bar.md`
- `Create Task From Idea: Foo Bar` -> `create-task-from-idea-foo-bar.md`
- `Shelve Idea: Foo Bar` -> `shelve-idea-foo-bar.md`

## UI Inference

External UIs can infer idea-to-task relationships purely from task filenames by stripping the known prefix slugs:

- `refine-idea-foo-bar.md` -> strip `refine-idea-` -> idea slug `foo-bar.md`
- `create-task-from-idea-foo-bar.md` -> strip `create-task-from-idea-` -> idea slug `foo-bar.md`
- `shelve-idea-foo-bar.md` -> strip `shelve-idea-` -> idea slug `foo-bar.md`

## Linter Validation

The linter validates that the idea title after the prefix corresponds to an existing idea file in `.dust/ideas/`. `IDEA_TRANSITION_PREFIXES` and `titleToFilename` are defined in `lib/workflow-tasks.ts` and re-exported from `lint-markdown.ts` for external tool use.

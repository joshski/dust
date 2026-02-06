# Idea Transition Tasks

Tasks that trigger lifecycle transitions on ideas use a special title convention.

## Prefixes

- `Refine Idea: <Idea Title>` - Research and add detail to a vague idea, resolving open questions
- `Create Task From Idea: <Idea Title>` - Convert a fleshed-out idea into a concrete task
- `Shelve Idea: <Idea Title>` - Remove an idea that is no longer worth pursuing

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

The linter validates that the idea title after the prefix corresponds to an existing idea file in `.dust/ideas/`. The `IDEA_TRANSITION_PREFIXES` constant is exported from `lint-markdown.ts` so external tools can use the same list.

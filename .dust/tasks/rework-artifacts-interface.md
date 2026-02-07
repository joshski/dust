# Rework Artifacts Interface

Replace the separate "artifacts" browser package with opinionated, per-transition task-creation functions in the main package.

## Background

The `lib/artifacts/idea-transition-task.ts` module was introduced as a browser-compatible package (exported as `@joshski/dust/artifacts` and built with `--target browser`). Two things have changed since then:

1. The calling code does not actually run in a browser, so the browser-target constraint is unnecessary. The module can live in the main package alongside the rest of the library code.
2. The current `createIdeaTransitionTask` function is too general — callers must supply `openingSentence`, `goals`, `blockedBy`, and `definitionOfDone` for every transition, even though sensible defaults differ by transition type.

## What to change

### 1. Remove the separate artifacts export

- Delete the `"./artifacts": "./dist/artifacts.js"` entry from `package.json` exports.
- Remove the `bun build lib/artifacts/idea-transition-task.ts --target browser --outfile dist/artifacts.js` step from the build script.
- Move the source from `lib/artifacts/` into `lib/cli/` (or another appropriate location in the main package).

### 2. Replace the generic function with per-transition functions

Instead of one `createIdeaTransitionTask` that takes a `transition` discriminator and requires all fields, provide four focused functions. Each function takes only the minimum required arguments and an optional `description` string. Everything else — opening sentence, blocked-by, and definition of done — is fully determined by the task type. Generated tasks do not link to any goals. The optional `description` is rendered as a new paragraph after the hard-coded opening sentence.

#### `createRefineIdeaTask(ideaSlug, description?)`

Given an idea called "Progress Broadcasting", creates a task file like:

```markdown
# Refine Idea: Progress Broadcasting

Research and refine this idea into a well-defined proposal. See [Progress Broadcasting](../ideas/progress-broadcasting.md).

<description if provided>

## Goals

(none)

## Blocked By

(none)

## Definition of Done

- [ ] Open questions are identified and resolved
- [ ] Idea file is updated with findings
```

#### `createTaskFromIdea(ideaSlug, description?)`

Given an idea called "Progress Broadcasting", creates a task file like:

```markdown
# Create Task From Idea: Progress Broadcasting

Create a well-defined task from this idea. See [Progress Broadcasting](../ideas/progress-broadcasting.md).

<description if provided>

## Goals

(none)

## Blocked By

(none)

## Definition of Done

- [ ] A new task is created in .dust/tasks/
- [ ] The original idea is deleted or updated to reflect remaining scope
```

#### `createShelveIdeaTask(ideaSlug, description?)`

Given an idea called "Progress Broadcasting", creates a task file like:

```markdown
# Shelve Idea: Progress Broadcasting

Archive this idea and remove it from the active backlog. See [Progress Broadcasting](../ideas/progress-broadcasting.md).

<description if provided>

## Goals

(none)

## Blocked By

(none)

## Definition of Done

- [ ] Idea file is deleted
- [ ] Rationale is recorded in the commit message
```

#### `createCaptureIdeaTask(description)`

Unlike the other functions, this does not take an `ideaSlug` since it creates an idea rather than transitioning an existing one. The `description` is mandatory and must not be whitespace-only (throws an error if it is). Creates a task file like:

```markdown
# Capture Idea

Research and capture a new idea in the dust backlog.

<description>

## Goals

(none)

## Blocked By

(none)

## Definition of Done

- [ ] A new idea file is created in .dust/ideas/
- [ ] Idea has a clear title and description
```

### 3. Keep useful shared utilities

- `titleToFilename` and `IDEA_TRANSITION_PREFIXES` remain useful and should be preserved (moved with the rest of the code).

### 4. Update tests

- Move and update the existing tests from `lib/artifacts/idea-transition-task.test.ts`.
- Add tests verifying the auto-filled defaults for each transition type.
- Remove tests that only exercised the old generic interface.

## Goals

- [agent-autonomy](../goals/agent-autonomy.md)
- [context-window-efficiency](../goals/context-window-efficiency.md)
- [decoupled-code](../goals/decoupled-code.md)
- [intuitive-directory-structure](../goals/intuitive-directory-structure.md)

## Blocked By

(none)

## Definition of Done

- [ ] The `./artifacts` export and its browser build step are removed from `package.json`
- [ ] Source code is moved out of `lib/artifacts/` into the main package
- [ ] Per-transition task-creation functions exist with sensible auto-filled defaults
- [ ] Opening sentence is hard-coded per transition type, not caller-supplied
- [ ] Idea-referencing tasks include a relative link to the idea after the opening sentence
- [ ] An optional `description` field adds a new paragraph after the opening sentence
- [ ] A `createCaptureIdeaTask(description)` function exists for creating ideas from scratch
- [ ] `createCaptureIdeaTask` throws if `description` is empty or whitespace-only
- [ ] Each function takes only the minimum required arguments and an optional `description` — no other arguments
- [ ] `titleToFilename` and `IDEA_TRANSITION_PREFIXES` are preserved
- [ ] All existing tests are updated or replaced; new tests cover auto-filled defaults
- [ ] `bin/dust check` passes

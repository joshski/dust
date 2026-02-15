# Add ideas with "Build it now" option

Allow users to skip idea file creation and go straight to creating tasks when adding an idea. A `buildItNow` option on `createCaptureIdeaTask` changes the generated task's instructions to produce task files instead of an idea file.

## Context

Currently, `createCaptureIdeaTask` in `lib/workflow-tasks.ts` always generates a task file with the `Add Idea:` prefix that instructs the agent to:

1. Research the idea thoroughly
2. Create an idea file at `.dust/ideas/{slug}.md`
3. Explore the codebase for context
4. Identify ambiguity and add open questions
5. Review `.dust/goals/` and `.dust/facts/` for alignment

This creates a two-step pipeline for turning an idea into work: first capture the idea (via `Add Idea:` task), then decompose it into tasks (via `Decompose Idea:` task). When a user already knows they want to build something, this intermediate step adds overhead without value.

## How it would work

`createCaptureIdeaTask` would accept an option (e.g. `buildItNow: true`) that changes the generated task's instructions. Instead of instructing the agent to create an idea file, the task would instruct the agent to:

1. Research the idea by exploring the codebase
2. Review `.dust/goals/` and `.dust/facts/` for alignment
3. Create one or more well-defined task files in `.dust/tasks/`
4. Prefer narrowly scoped tasks that deliver vertical slices of working software

This mirrors the instructions currently in `decomposeIdea()`, but without requiring an idea file to exist first. The task title would still use the `Add Idea:` prefix so it's discoverable by `findAllCaptureIdeaTasks` and `parseCaptureIdeaTask`.

## Relationship to existing features

- **`decomposeIdea()`** creates tasks from an existing idea file. "Build it now" achieves a similar outcome but skips the idea file entirely.
- **"Allow analysis depth when adding an idea"** (existing idea) proposes an `analysisDepth` parameter for `createCaptureIdeaTask`. "Build it now" is a different dimension — it changes the _output_ (tasks vs idea file) rather than the _depth_ of research. These features could coexist: a "build it now" idea could still have configurable analysis depth for how thoroughly the agent researches before creating tasks.
- **`parseCaptureIdeaTask()`** currently extracts `ideaTitle` and `ideaDescription` from capture tasks. It may need to also parse the `buildItNow` flag so callers can distinguish between the two modes.

## Definition of Done changes

When `buildItNow` is true, the generated task's Definition of Done should change from:

- Idea file exists at `.dust/ideas/{path}`
- Idea file has an H1 title matching "{title}"
- Idea includes relevant context from codebase exploration
- Open questions are added for any ambiguous aspects

To something like:

- One or more new tasks are created in `.dust/tasks/`
- Tasks link to relevant goals from `.dust/goals/`
- Tasks are narrowly scoped vertical slices

## Open Questions

### Should "Build it now" tasks still use the `Add Idea:` prefix?

#### Keep the `Add Idea:` prefix

The prefix indicates "this task was created from an idea submission". `findAllCaptureIdeaTasks` and the linter already understand this prefix. Adding a new prefix would require updating discovery and validation logic.

#### Use a new prefix like `Build Idea:`

A distinct prefix makes it clear that this task produces tasks, not an idea file. The linter wouldn't expect a corresponding idea file to be created. But it adds a new concept to the prefix system.

### How should the `buildItNow` option be passed to the function?

#### Add an optional `options` object parameter

Change the signature to `createCaptureIdeaTask(fileSystem, dustPath, title, description, options?: { buildItNow?: boolean })`. Backwards-compatible and follows the pattern used by `decomposeIdea` with its `DecomposeIdeaOptions`.

#### Add a boolean parameter

Change the signature to `createCaptureIdeaTask(fileSystem, dustPath, title, description, buildItNow?: boolean)`. Simpler but less extensible if more options are added later (see the "analysis depth" idea).

#### Refactor to a single options object

Align with the proposed API from the "analysis depth" idea: `addIdea(fileSystem, { title, description, buildItNow })`. More forward-looking but a larger change.

### What happens to `parseCaptureIdeaTask` for "Build it now" tasks?

#### Parse the `buildItNow` flag from the task content

Add a field to `ParsedCaptureIdeaTask` so callers know whether to expect an idea file or task files as the output. This could be detected from the task body text or Definition of Done.

#### No changes needed

If `parseCaptureIdeaTask` is only used to extract title and description for display purposes, and callers don't need to distinguish between modes, no changes are needed.

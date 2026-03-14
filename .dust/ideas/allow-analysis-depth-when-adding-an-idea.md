# Allow "analysis depth" when adding an idea

Rename `createCaptureIdeaTask` to `addIdea`. It should take two arguments:

* a fileSystem
* an object with { title, description, analysisDepth }

`analysisDepth` should allow the user to control how deeply the agent researches before creating the idea file.

## Context

Currently, `createCaptureIdeaTask` in `lib/workflow-tasks.ts` creates a task file that instructs the agent to:

1. Research the idea thoroughly
2. Read the codebase for relevant context
3. Flesh out the description
4. Identify ambiguity and add open questions
5. Review [`.dust/principles/`](../principles) and [`.dust/facts/`](../facts) for context

This is a fixed level of analysis depth. The task description always says "Research this idea thoroughly" regardless of whether the idea needs deep research or is already well-understood.

## Current API

```typescript
createCaptureIdeaTask(
  fileSystem: FileSystem,
  dustPath: string,
  title: string,
  description: string
): Promise<CreateIdeaTransitionTaskResult>
```

## Proposed API

```typescript
addIdea(
  fileSystem: FileSystem,
  options: {
    title: string
    description: string
    analysisDepth: AnalysisDepth
  }
): Promise<CreateIdeaTransitionTaskResult>
```

Note: The `dustPath` parameter is removed. This would require `addIdea` to determine the dust path from the fileSystem or receive it as part of options.

## Analysis Depth Options

Possible values for `analysisDepth`:

- **minimal** - Create the idea file directly with the provided description, minimal or no codebase research
- **standard** - Current behavior: research thoroughly, explore codebase, identify ambiguities, add open questions
- **deep** - Extended research: explore related ideas, principles, and facts; consider architectural implications; identify dependencies

## Open Questions

### Where should dustPath come from?

#### Add dustPath to the options object

Keep the explicit parameter but move it inside the options: `{ title, description, analysisDepth, dustPath }`. Maintains current flexibility without changing the function's discoverability requirements.

#### Have the function discover dustPath automatically

The function would find `.dust` in the current working directory or walk up the directory tree. Simpler API but adds an implicit dependency on filesystem state.

#### Keep dustPath as a separate parameter

Use `addIdea(fileSystem, dustPath, options)`. Matches the existing API pattern but doesn't align with the two-argument signature in the task description.

### What should minimal depth produce?

#### Create the idea file directly

Skip creating a task file entirely. The idea file would be created immediately with the provided description. Fast path for well-understood ideas.

#### Create a task file with lighter instructions

Still create a task, but with simpler instructions like "Create an idea file with the provided description." Maintains the task-based workflow uniformly.

### Should the function still create a task, or create the idea directly?

#### Keep creating tasks for all depths

Vary only the instructions in the task file. All depths go through the same task-based workflow. Simplest implementation and most consistent behavior.

#### For minimal depth, create the idea directly; for others, create a task

Minimal depth bypasses the task system entirely. Higher depths create tasks with varying levels of research instructions. More ergonomic for quick ideas.

#### Always create the idea file, but for higher depths also create a follow-up refinement task

The idea file is always created immediately. Higher depths would also spawn a "Refine Idea" task to add more context. Two-step process for deeper analysis.

### What happens to CAPTURE_IDEA_PREFIX and findAllCaptureIdeaTasks?

#### Keep them for task-based flows

If some depths still create tasks, these remain useful for finding in-progress idea captures. No changes needed unless minimal depth is common.

#### Deprecate and remove

If most usage shifts to direct idea creation, these become less useful. Could be removed in favor of just scanning the ideas directory.

### Should analysis depth be a user-facing concept?

#### Internal use only

The API is for other dust functions to call. CLI commands would choose the appropriate depth internally based on context.

#### CLI exposure

Expose via flags like `dust new idea --depth minimal`. Gives users explicit control over how much research the agent does.

#### Both

Make it available internally and as a CLI option. Maximum flexibility but requires clear documentation of what each depth means.

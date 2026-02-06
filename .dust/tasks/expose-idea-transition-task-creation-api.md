# Expose Idea Transition Task Creation API

Expose a browser-compatible API for creating idea transition tasks, so external web UIs can create dust artifacts via a pluggable filesystem.

## Background

A web UI is being built in a separate repository that uses GitHub OAuth to read/write files on the user's behalf. It needs to create idea transition tasks (Refine, Create Task From, Shelve) programmatically. The creation logic should be pure JavaScript with no Node.js dependencies, accepting a `FileSystem` interface so the web app can provide a GitHub API-backed implementation.

## Implementation

Add a new module at `lib/artifacts/idea-transition-task.ts` that exports a `createIdeaTransitionTask` function. This function should:

1. Accept a `FileSystem` (from `lib/cli/types.ts`) and a strongly-typed input object
2. Validate the referenced idea exists via `fileSystem.exists`
3. Generate the markdown content with correct structure (title, opening sentence, Goals, Blocked By, Definition of Done)
4. Derive the filename using `titleToFilename` and `IDEA_TRANSITION_PREFIXES`
5. Write the file to the correct path via `fileSystem.writeFile`

The input type should look like:

```typescript
interface CreateIdeaTransitionTaskInput {
  transition: 'refine-idea' | 'create-task-from-idea' | 'shelve-idea'
  ideaSlug: string
  openingSentence: string
  goals: string[]       // goal slugs
  blockedBy: string[]   // task slugs
  definitionOfDone: string[]
}
```

Add a second build target in `package.json` that bundles this module as browser-compatible JS, and expose it via the `"exports"` field (e.g., `@joshski/dust/artifacts`). The module must not import from `node:path` or any other Node.js built-in — use simple string operations for path manipulation.

Ensure `titleToFilename` and `IDEA_TRANSITION_PREFIXES` are importable from this entry point without pulling in Node.js dependencies.

## Goals

- [Decoupled Code](../goals/decoupled-code.md)
- [Minimal Dependencies](../goals/minimal-dependencies.md)
- [Easy Adoption](../goals/easy-adoption.md)

## Blocked By

(none)

## Definition of Done

- [ ] `createIdeaTransitionTask` function exists and accepts a `FileSystem` and typed input
- [ ] Function validates the referenced idea exists before writing
- [ ] Function generates correct markdown matching lint-markdown validation rules
- [ ] Function derives filenames correctly using existing `titleToFilename` logic
- [ ] No Node.js built-in imports in the new module
- [ ] Browser-compatible bundle exposed via `"exports"` in `package.json`
- [ ] Unit tests cover all three transition types and the validation error case
- [ ] Existing tests continue to pass

# Use exported types from @joshski/dust/types in dustbucket

Replace inline type definitions in dustbucket with imports from `@joshski/dust/types`. This eliminates duplication and strengthens type safety.

## Changes

1. **AgentSessionEvent** in `src/routes/api/agent/connect.ts:16` — replace local `EventMessage` interface's loose `event: { type: string; [key: string]: unknown }` with the `AgentSessionEvent` discriminated union
2. **IdeaOpenQuestion / IdeaOption** in `src/components/idea-parser.ts:3` — replace local `OpenQuestion` (with `options: string[]`) with `IdeaOpenQuestion` (with `IdeaOption[]`)
3. **OpenQuestionResponse** in `src/routes/api/repos/ideas/idea/transition.ts:34` and `src/services/github-service.tsx:50` — replace inline `Array<{ question: string; chosenOption: string }>` with `OpenQuestionResponse[]`
4. **CreateIdeaTransitionTaskResult** in `src/routes/api/repos/ideas/idea/transition.ts:81` — replace `Awaited<ReturnType<...>>` workaround with the named type
5. **DecomposeIdeaOptions** in `src/routes/api/repos/ideas/idea/transition.ts:31` — replace inline `body as { ... }` cast with the shared type
6. **WorkflowTaskType** in `src/components/ArtifactDrawer.tsx:28` — change `Record<string, string>` to `Record<WorkflowTaskType, string>` (already imported)

## Principles

- [Reasonably DRY](../principles/reasonably-dry.md)
- [Naming Matters](../principles/naming-matters.md)

## Blocked By

(none)

## Definition of Done

- [ ] All 6 inline type definitions replaced with imports from `@joshski/dust/types`
- [ ] Local `OpenQuestion` interface in `idea-parser.ts` removed
- [ ] Local `EventMessage` interface in `connect.ts` removed or updated to use `AgentSessionEvent`
- [ ] TypeScript compiles with no new errors in dustbucket
- [ ] Existing tests pass

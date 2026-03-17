# Artifact Patch API: Ideas

Extend `buildArtifactPatch()` to support idea artifacts.

## Context

This builds on the Artifact Patch API: Principles (now complete) to add idea support. Ideas already have a partial serializer (`ideaContentToMarkdown` in `lib/artifacts/ideas.ts`) that needs to be adapted to the public API pattern. The design decisions require:

- **Markdown body field**: Ideas should accept a `body` field for prose content
- **Open Questions**: Ideas have structured open questions with options

## Implementation

### Serializer

Add `serializeIdea(input: IdeaInput): string` that wraps and extends the existing `ideaContentToMarkdown` function.

### Input Type

```typescript
interface IdeaOpenQuestion {
  question: string
  options: Array<{
    name: string
    description: string
  }>
}

interface IdeaInput {
  title: string
  body?: string
  openQuestions?: IdeaOpenQuestion[]
}
```

### High-Level API Extension

```typescript
const result = await buildArtifactPatch(fileSystem, dustPath, {
  ideas: {
    'new-feature': {
      title: 'New Feature',
      body: 'Description of the feature idea.\n\n## Context\n\nAdditional background.',
      openQuestions: [
        {
          question: 'Which approach should we take?',
          options: [
            { name: 'Option A', description: 'Description of option A.' },
            { name: 'Option B', description: 'Description of option B.' },
          ],
        },
      ],
    },
    'old-idea': null,  // delete
  },
})
```

### Reference Handling

When an idea is deleted:
1. Find workflow tasks that reference the idea (via `## Decomposes Idea`, `## Refines Idea`, etc.)
2. Update those sections to remove the link
3. Remove any other markdown links to the idea across `.dust/`

### Package Export

Add `serializeIdea` to the `@joshski/dust/patch` entry point.

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Decoupled Code](../principles/decoupled-code.md)
- [Agent Autonomy](../principles/agent-autonomy.md)
- [Reasonably DRY](../principles/reasonably-dry.md)

## Blocked By

(none)

## Definition of Done

- `serializeIdea()` produces valid idea markdown with open questions
- `buildArtifactPatch()` accepts an `ideas` object
- Existing `ideaContentToMarkdown` is reused or consolidated
- Deleting an idea updates workflow tasks and removes references
- Unit tests cover serialization, open questions, and reference cleanup
- `bin/dust check` passes

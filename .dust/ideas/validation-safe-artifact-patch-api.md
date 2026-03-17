# Validation-safe artifact patch API

Expose an API for building multi-file artifact patches from structured objects with automatic relationship validation.

## Context

Downstream consumers of dust (such as AI agents building workflow tools) need to make coordinated changes across multiple artifact files. Currently, the `@joshski/dust/validation` export provides `validatePatch()` which validates proposed changes against existing `.dust/` content. However, this API operates at the file/string level and requires callers to:

1. Understand markdown formatting rules for each artifact type
2. Know the relationship semantics (principle hierarchy links, task blockers, idea references)
3. Manually construct valid markdown content
4. Discover and update referencing files when deleting or renaming artifacts

The existing [Reference-safe task deletion](./reference-safe-task-deletion.md) idea explores a specific instance of this problem—deleting a task requires updating `## Blocked By` sections in other tasks that reference it.

## Current API Surface

From the [Package Exports](../facts/package-exports.md) fact:

```typescript
// @joshski/dust/validation
import { validatePatch } from '@joshski/dust/validation'

const result = await validatePatch(fileSystem, dustPath, {
  files: {
    'facts/my-fact.md': '# My Fact\n\nContent here.',  // add/update
    'facts/old-fact.md': null,                          // delete
  },
})
// result: { valid: boolean, violations: Violation[] }
```

From `@joshski/dust/artifacts`:

```typescript
const repository = buildArtifactsRepository(fileSystem, dustPath)
const idea = await repository.parseIdea({ slug: 'my-idea' })
// idea: { slug, title, openingSentence, content, openQuestions }
```

The repository exposes parsed artifact objects (Idea, Task, Fact, Principle) but no inverse operation—no way to generate valid markdown from a modified object or to express changes as object-level transformations.

## Proposed Direction

Expose an API where callers express the desired state of artifacts as typed objects. The API validates relationships between those artifacts (and existing artifacts on the filesystem), then produces an `ArtifactPatch` ready for application:

```typescript
import { buildArtifactPatch } from '@joshski/dust/patch'

const result = await buildArtifactPatch(fileSystem, dustPath, {
  tasks: {
    'my-task': {
      title: 'My Task',
      blockedBy: ['other-task'],
      principles: ['actionable-errors'],
      definitionOfDone: ['Task is completed'],
    },
  },
  facts: {
    'new-fact': {
      title: 'New Fact',
      content: 'Description of the fact.',
    },
  },
  deletions: ['tasks/old-task'],
})

// result: { valid: boolean, violations: Violation[], patch: ArtifactPatch }
// patch.files contains generated markdown, ready to apply if result.valid
```

This approach:
- Uses full object replacement (callers provide complete artifact state)
- Generates valid markdown automatically from structured objects
- Validates all relationships before returning the patch
- Returns a standard `ArtifactPatch` that existing tooling can apply
- Does not require callers to think in terms of "changes"—just express desired state

### Handling Deletions

Deletions are expressed as a separate array of paths. For reference-safe deletion (e.g., removing a task and updating `## Blocked By` sections in other tasks), callers would:

1. Provide the deletion in the `deletions` array
2. Provide updated versions of tasks that previously referenced the deleted task

The API validates that the resulting state has no broken references.

### Handling Renames

Renames are composed from delete + create. To rename `old-task` to `new-task`:

```typescript
const result = await buildArtifactPatch(fileSystem, dustPath, {
  tasks: {
    'new-task': { title: 'New Task', /* ... */ },
  },
  deletions: ['tasks/old-task'],
})
```

Callers are responsible for providing updated references in any artifacts that linked to the old slug.

### Principle Hierarchy

Tree manipulation for principles uses full object replacement with explicit relationships:

```typescript
const result = await buildArtifactPatch(fileSystem, dustPath, {
  principles: {
    'child-principle': {
      title: 'Child Principle',
      parentPrinciple: 'new-parent',
      subPrinciples: [],
      content: 'Description here.',
    },
    'new-parent': {
      title: 'New Parent',
      parentPrinciple: null,
      subPrinciples: ['child-principle'],
      content: 'Parent description.',
    },
    'old-parent': {
      title: 'Old Parent',
      parentPrinciple: null,
      subPrinciples: [], // child-principle removed
      content: 'Old parent description.',
    },
  },
})
```

The API validates bidirectional link consistency—if `child-principle` declares `parentPrinciple: 'new-parent'`, then `new-parent` must include `child-principle` in its `subPrinciples` array (either in the patch or on disk).

## Relationship Types

Based on codebase analysis, artifacts have these relationships:

| Relationship | Enforced | Description |
|--------------|----------|-------------|
| Principle parent | Yes | `## Parent Principle` section links to one principle |
| Principle children | Yes | `## Sub-Principles` section links to principles, must be bidirectional |
| Task blockers | Yes | `## Blocked By` section links to task files |
| Task → principles | Yes | `## Principles` section links to principle files |
| Workflow task → idea | Yes | Transition tasks (`Refine Idea:`, etc.) link to target idea |
| Markdown links | Yes | Any markdown link must resolve to existing file |

## Implementation Path

1. **Artifact serializers** — Each artifact type needs a serializer that produces valid markdown from a typed object. The inverse of `parseIdea()`, `parseTask()`, etc. One serializer already exists: `ideaContentToMarkdown()` in `lib/artifacts/ideas.ts`.

2. **Input types** — Define TypeScript types for artifact inputs that mirror the parsed types but without `slug` (derived from the key) and without `content` (the raw markdown field that gets reconstructed).

3. **Patch builder** — Combine serialized artifacts into an `ArtifactPatch`, merge with deletion entries, and run validation.

4. **Reference resolution** — For deletions, callers must explicitly provide updated versions of artifacts that referenced the deleted item. The API validates that no broken references exist in the final state.

## Alignment with Principles

| Principle | Alignment |
|-----------|-----------|
| [Decoupled Code](../principles/decoupled-code.md) | Strong — structured API avoids markdown coupling in consumers |
| [Actionable Errors](../principles/actionable-errors.md) | Strong — validation catches issues before writes |
| [Agent Autonomy](../principles/agent-autonomy.md) | Strong — agents can compose changes without markdown expertise |
| [Small Units](../principles/small-units.md) | Moderate — atomic changes are encouraged but multi-file patches are necessary |

## Related Work

- [Reference-safe task deletion](./reference-safe-task-deletion.md) — addresses the specific case of task deletion
- [Expose more types](./expose-more-types.md) — discusses exposing `Fact`, `Principle`, and other types from `/types`

## Open Questions

### What level of abstraction should the public API expose?

#### Option: High-level only

Expose only `buildArtifactPatch()` that takes artifact objects and returns a validated patch:

```typescript
const result = await buildArtifactPatch(fileSystem, dustPath, { tasks, facts, ... })
```

Simple for consumers but less flexible for callers who want fine-grained control.

#### Option: Both high-level and serializers

Also expose individual artifact serializers for callers who need direct markdown generation:

```typescript
import { serializeTask, serializeFact } from '@joshski/dust/serializers'

const markdown = serializeTask(taskObject)
```

More power but more API surface to maintain. Serializers would need their own input types (without the raw `content` field).

### Should the API auto-update referencing artifacts on deletion?

#### Option: Require explicit updates

Callers must provide updated versions of all artifacts that reference a deleted item. The API only validates—it does not discover or modify references.

```typescript
const result = await buildArtifactPatch(fileSystem, dustPath, {
  tasks: {
    'dependent-task': { blockedBy: [] }, // caller removed the reference
  },
  deletions: ['tasks/old-task'],
})
```

This keeps the API simple and predictable. Callers have full control but must track references themselves.

#### Option: Auto-discover and update references

The API scans existing artifacts, discovers references to deleted items, and generates updates:

```typescript
const result = await buildArtifactPatch(fileSystem, dustPath, {
  deletions: ['tasks/old-task'],
})
// result.patch.files includes updated versions of tasks that referenced old-task
```

More convenient but adds complexity and may produce unexpected changes.

### How should body content be expressed for artifacts?

#### Option: Markdown body field

Include a `body` field for content that appears between the title and structured sections:

```typescript
{
  tasks: {
    'my-task': {
      title: 'My Task',
      body: 'This task addresses the widget performance issue.\n\nAdditional context here.',
      blockedBy: [],
      definitionOfDone: ['Widget loads in under 100ms'],
    },
  },
}
```

This handles the common case of prose content. The serializer would place the body after the opening sentence line.

#### Option: Opening sentence only

Only support the opening sentence (first line of prose) with a separate field. Any additional body content would require using the lower-level serializer API.

```typescript
{
  tasks: {
    'my-task': {
      title: 'My Task',
      openingSentence: 'This task addresses the widget performance issue.',
      blockedBy: [],
      definitionOfDone: ['Widget loads in under 100ms'],
    },
  },
}
```

Simpler but limits expressiveness for artifacts that need longer descriptions.

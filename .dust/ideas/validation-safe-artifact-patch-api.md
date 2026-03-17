# Validation-safe artifact patch API

Expose an API for building multi-file artifact patches as structured objects with automatic relationship validation.

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

Expose artifact relationships and changes as typed objects rather than requiring callers to manipulate markdown strings:

```typescript
// Hypothetical API
import { buildPatchFromChanges } from '@joshski/dust/patch'

const patch = buildPatchFromChanges(fileSystem, dustPath, [
  { type: 'delete-task', slug: 'old-task' },
  { type: 'update-task', slug: 'another-task', changes: { blockedBy: ['remaining-task'] } },
  { type: 'create-fact', slug: 'new-fact', title: 'New Fact', content: 'Description.' },
])

const result = await validatePatch(fileSystem, dustPath, patch)
// patch.files is the generated markdown, ready to apply if result.valid
```

This would:
- Generate valid markdown automatically from structured change descriptors
- Rewrite references in related files (e.g., removing a deleted task from `## Blocked By` sections)
- Validate the resulting changeset before any writes occur
- Return a standard `ArtifactPatch` that existing tooling can apply

## Relationship Types to Consider

Based on codebase analysis, artifacts have these relationships:

| Relationship | Enforced | Description |
|--------------|----------|-------------|
| Principle parent | Yes | `## Parent Principle` section links to one principle |
| Principle children | Yes | `## Sub-Principles` section links to principles, must be bidirectional |
| Task blockers | Yes | `## Blocked By` section links to task files |
| Task → principles | Yes | `## Principles` section links to principle files |
| Workflow task → idea | Yes | Transition tasks (`Refine Idea:`, etc.) link to target idea |
| Markdown links | Yes | Any markdown link must resolve to existing file |

The principle hierarchy is the most complex—adding or removing a principle requires updating both parent and child links to maintain bidirectional integrity.

## Implementation Considerations

1. **Change descriptor types** — Define a discriminated union of change operations per artifact type (create, update, delete, rename).

2. **Markdown generation** — Each artifact type needs a serializer that produces valid markdown from the parsed object structure. This is the inverse of the existing `parseFact()`, `parseIdea()`, etc.

3. **Reference resolution** — For deletions and renames, the API must discover all files referencing the target and generate updates for them.

4. **Dry-run by default** — The API returns a patch that can be inspected before applying. This fits the existing `validatePatch()` → apply workflow.

5. **Error granularity** — Changes that can't be expressed (e.g., deleting a principle with children) should fail fast with clear errors, not produce invalid patches.

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

### Should the API support partial updates or require full object replacement?

#### Partial update descriptors

Allow targeted changes like `{ blockedBy: ['new-task'] }` that merge with existing content:

```typescript
{ type: 'update-task', slug: 'my-task', changes: { blockedBy: ['new-blocker'] } }
```

This minimizes data the caller must provide and avoids overwriting unrelated sections. However, it requires diffing against existing content and defining merge semantics for each field.

#### Full object replacement

Require callers to supply the complete parsed object:

```typescript
{ type: 'update-task', slug: 'my-task', task: { title, blockedBy, definitionOfDone, ... } }
```

Simpler implementation (no merge logic) but forces callers to first read the full object and preserve unmodified fields.

### Should rename operations be first-class?

#### Explicit rename change type

Add a dedicated rename operation that handles reference rewriting:

```typescript
{ type: 'rename-task', oldSlug: 'old-name', newSlug: 'new-name' }
```

This clearly expresses intent and enables the API to rewrite all references automatically.

#### Compose from delete + create

Callers express rename as a delete of the old file plus create of the new file. The API would need to infer that this is a rename (matching content/title) to update references, or callers manually update references.

More primitive, but potentially ambiguous when filenames change alongside content changes.

### How should principle hierarchy changes be expressed?

#### Tree manipulation operations

Provide operations specific to the principle tree:

```typescript
{ type: 'reparent-principle', slug: 'child-principle', newParent: 'new-parent-slug' }
{ type: 'add-sub-principle', parent: 'parent-slug', child: 'child-slug' }
```

These encapsulate the bidirectional link maintenance logic.

#### Generic update with computed side effects

Use standard update operations and have the API compute necessary link changes:

```typescript
{ type: 'update-principle', slug: 'child', changes: { parentPrinciple: 'new-parent' } }
// API generates updates to both old and new parent's ## Sub-Principles sections
```

More uniform but hides complexity—callers may not realize their "one change" becomes multiple file edits.

### What level of abstraction should the public API expose?

#### High-level: change descriptors only

Expose only the change-to-patch transformation. Callers submit structured changes, receive a patch:

```typescript
const patch = await buildPatchFromChanges(fileSystem, dustPath, changes)
// patch.files contains ready-to-apply markdown
```

Simple for consumers but less flexible.

#### Low-level: expose serializers separately

Also expose individual artifact serializers for callers who need fine-grained control:

```typescript
import { serializeTask, serializePrinciple } from '@joshski/dust/serializers'

const markdown = serializeTask(taskObject)
```

More power but more API surface to maintain.

# Add Artifact Patch Previews

Add a `previews` array to `BuildArtifactPatchResult` with type, slug, action, and content for each artifact. This enables UIs to show a diff-like preview before applying a patch.

## Background

The current `buildArtifactPatch` result buries serialized markdown inside `patch.files`, keyed by file paths. A downstream UI can't easily render a preview without parsing paths to determine artifact types and actions.

## Implementation

Add an `ArtifactPreview` type and `previews` array to the result:

```typescript
interface ArtifactPreview {
  type: 'fact' | 'idea' | 'principle' | 'task'
  slug: string
  action: 'create' | 'update' | 'delete'
  content: string | null  // null for deletions
}
```

**Functional Core:** Build preview objects from the patch data. Each entry in `patch.files` maps to one preview. The `type` and `slug` are parsed from the path (e.g., `facts/my-fact.md` → type: 'fact', slug: 'my-fact').

**Imperative Shell:** To distinguish create vs update, check `fileSystem.readFile` for each non-deletion path. If the file exists, it's an update; otherwise, it's a create.

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Design for Testability](../principles/design-for-testability.md)
- [Small Units](../principles/small-units.md)

## Blocked By

(none)

## Definition of Done

- `BuildArtifactPatchResult` includes a `previews: ArtifactPreview[]` field
- Each preview has `type`, `slug`, `action`, and `content`
- `action` is determined by checking filesystem existence during patch building
- Unit tests cover create, update, and delete scenarios
- The `build-artifact-patch.md` fact is updated to document the new `previews` field

# Build Artifact Patch

The `@joshski/dust/patch` export provides a high-level, validation-safe API for building multi-file artifact patches from structured objects.

## API

```typescript
import { buildArtifactPatch } from '@joshski/dust/patch'

const result = await buildArtifactPatch(fileSystem, dustPath, {
  facts: {
    'new-fact': { title: 'New Fact', body: 'Description here.' },
    'old-fact': null, // delete
  },
  ideas: {
    'my-idea': { title: 'My Idea', body: 'Rough proposal.' },
  },
})
// result: { valid: boolean, violations: Violation[], patch: ArtifactPatch, previews: ArtifactPreview[] }
```

## How It Works

`buildArtifactPatch` accepts structured input objects (`FactInput`, `IdeaInput`, `PrincipleInput`, `TaskInput`) keyed by slug, serializes them to markdown, and runs validation before returning the result. Setting a value to `null` signals deletion.

When deleting artifacts, the function automatically:
- Finds and removes markdown links to deleted files across all existing artifacts
- Cleans up `Blocked By` sections that become empty after link removal
- Updates principle hierarchy sections (`Parent Principle`, `Sub-Principles`) when principles are deleted

For principles, it also validates bidirectional hierarchy consistency — ensuring parent/child relationships are reciprocal across both existing and patched principles.

The returned `patch` can be passed directly to `validatePatch` or applied to the filesystem.

## Previews

The result includes a `previews` array that provides a structured view of all artifact changes, making it easy for UIs to render diff-like previews before applying a patch:

```typescript
interface ArtifactPreview {
  type: 'fact' | 'idea' | 'principle' | 'task'
  slug: string
  action: 'create' | 'update' | 'delete'
  content: string | null  // null for deletions
}
```

The `action` field is determined by checking filesystem existence: if the file exists, it's an `update`; otherwise, it's a `create`. Deletions always have `action: 'delete'` and `content: null`.

## Key Types

- `ArtifactPatchInput` — `{ facts?, ideas?, principles?, tasks? }` where each field is `Record<string, Input | null>`
- `BuildArtifactPatchResult` — `{ valid: boolean, violations: Violation[], patch: ArtifactPatch, previews: ArtifactPreview[] }`
- `ArtifactPreview` — `{ type, slug, action, content }` for UI diff rendering
- Input types: `FactInput`, `IdeaInput`, `PrincipleInput`, `TaskInput` (with `StandardTaskInput` and `WorkflowTaskInput` variants)

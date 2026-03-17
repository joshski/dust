# Artifact Patch API: Facts

Implement `buildArtifactPatch()` and `serializeFact()` for fact artifacts.

## Context

Expose an API for building multi-file artifact patches from structured objects with automatic relationship validation. Facts are the simplest artifact type—just a title and body—making them ideal for establishing the API pattern. The design decisions are:

- **Both high-level and serializers**: Expose `buildArtifactPatch()` as the main API and `serializeFact()` for direct markdown generation
- **Markdown body field**: Facts should accept a `body` field containing the prose content
- **Auto-discover and update references**: When deleting a fact, the API should find and remove markdown links to it from other artifacts

## Implementation

### Functional Core

Create pure functions in `lib/patch/`:

1. **`serializeFact(input: FactInput): string`** — Converts a fact input object to valid markdown
2. **`buildFactFiles(input: FactInput, slug: string): Record<string, string>`** — Produces file entries for a patch

### Input Type

```typescript
interface FactInput {
  title: string
  body: string
}
```

The `slug` is derived from the key in `buildArtifactPatch({ facts: { 'my-fact': ... } })`.

### High-Level API

```typescript
import { buildArtifactPatch } from '@joshski/dust/patch'

const result = await buildArtifactPatch(fileSystem, dustPath, {
  facts: {
    'new-fact': { title: 'New Fact', body: 'Description here.' },
    'old-fact': null,  // delete
  },
})
// result: { valid: boolean, violations: Violation[], patch: ArtifactPatch }
```

### Package Export

Add a new entry point at `@joshski/dust/patch` exporting:
- `buildArtifactPatch`
- `serializeFact`

### Reference Handling on Deletion

When a fact is deleted (value is `null`), scan all existing artifacts for markdown links pointing to the deleted fact's file path and generate updated versions with those links removed.

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Decoupled Code](../principles/decoupled-code.md)
- [Agent Autonomy](../principles/agent-autonomy.md)
- [Actionable Errors](../principles/actionable-errors.md)

## Blocked By

(none)

## Definition of Done

- `serializeFact()` produces valid fact markdown from a `FactInput` object
- `buildArtifactPatch()` accepts a `facts` object and returns `{ valid, violations, patch }`
- Deleting a fact auto-discovers and updates artifacts that reference it
- `@joshski/dust/patch` entry point is added to `package.json` exports
- Unit tests cover serialization, creation, deletion, and reference cleanup
- `bin/dust check` passes

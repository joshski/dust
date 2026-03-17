# Artifact Patch API: Principles

Extend `buildArtifactPatch()` to support principle artifacts with hierarchy validation.

## Context

This builds on [Artifact Patch API: Tasks](artifact-patch-api-tasks.md) to add principle support. Principles have a tree hierarchy with parent/child relationships that must remain bidirectionally consistent. The design decisions require:

- **Markdown body field**: Principles should accept a `body` field for the opening sentence and any additional content
- **Bidirectional link validation**: If `child-principle` declares `parentPrinciple: 'parent'`, then `parent` must list `child-principle` in its `subPrinciples`

## Implementation

### Serializer

Add `serializePrinciple(input: PrincipleInput): string` as a pure function that produces valid principle markdown.

### Input Type

```typescript
interface PrincipleInput {
  title: string
  body?: string
  parentPrinciple?: string | null  // principle slug, null for root
  subPrinciples?: string[]          // principle slugs
}
```

### High-Level API Extension

```typescript
const result = await buildArtifactPatch(fileSystem, dustPath, {
  principles: {
    'child-principle': {
      title: 'Child Principle',
      body: 'Description of this principle.',
      parentPrinciple: 'new-parent',
      subPrinciples: [],
    },
    'new-parent': {
      title: 'New Parent',
      parentPrinciple: null,
      subPrinciples: ['child-principle'],
    },
  },
})
```

### Hierarchy Validation

The API validates bidirectional consistency:
- Every `parentPrinciple` reference must point to a principle that lists the referencer in `subPrinciples`
- Every `subPrinciples` entry must point to a principle with matching `parentPrinciple`
- This validation considers both the patch and existing principles on disk

### Reference Handling

When a principle is deleted:
1. Update parent principle to remove the deleted child from `subPrinciples`
2. Update child principles to clear their `parentPrinciple`
3. Remove links from task `## Principles` sections

### Package Export

Add `serializePrinciple` to the `@joshski/dust/patch` entry point.

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Decoupled Code](../principles/decoupled-code.md)
- [Agent Autonomy](../principles/agent-autonomy.md)

## Blocked By

- [Artifact Patch API: Tasks](artifact-patch-api-tasks.md)

## Definition of Done

- `serializePrinciple()` produces valid principle markdown with hierarchy sections
- `buildArtifactPatch()` accepts a `principles` object
- Bidirectional parent/child relationships are validated
- Deleting a principle updates hierarchy and removes references from tasks
- Unit tests cover serialization, hierarchy validation, and reference cleanup
- `bin/dust check` passes

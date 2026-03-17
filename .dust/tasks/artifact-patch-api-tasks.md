# Artifact Patch API: Tasks

Extend `buildArtifactPatch()` to support task artifacts, including workflow tasks.

## Context

This builds on [Artifact Patch API: Facts](artifact-patch-api-facts.md) to add task support. Tasks are more complex than facts—they have `blockedBy`, `principles`, and `definitionOfDone` sections with cross-file relationships. The design decisions require:

- **Markdown body field**: Tasks should accept a `body` field for prose content between the title and structured sections
- **Workflow tasks with type discriminator**: Workflow tasks (Refine Idea, Decompose Idea, etc.) use the same `tasks` object but with a `type` field that determines valid attributes

## Implementation

### Serializer

Add `serializeTask(input: TaskInput): string` as a pure function that produces valid task markdown.

### Input Types

```typescript
interface StandardTaskInput {
  type?: undefined
  title: string
  body?: string
  blockedBy?: string[]      // task slugs
  principles?: string[]     // principle slugs
  definitionOfDone: string[]
}

interface WorkflowTaskInput {
  type: 'capture-idea' | 'refine-idea' | 'decompose-idea' | 'shelve-idea'
  ideaSlug: string
  definitionOfDone?: string[]  // optional, has defaults per type
}

type TaskInput = StandardTaskInput | WorkflowTaskInput
```

For workflow tasks, the serializer generates the title and idea link automatically based on the `type` and `ideaSlug`.

### High-Level API Extension

```typescript
const result = await buildArtifactPatch(fileSystem, dustPath, {
  tasks: {
    'implement-feature': {
      title: 'Implement Feature',
      body: 'Additional context here.',
      blockedBy: ['design-feature'],
      principles: ['small-units'],
      definitionOfDone: ['Feature works', 'Tests pass'],
    },
    'refine-idea-my-feature': {
      type: 'refine-idea',
      ideaSlug: 'my-feature',
    },
    'old-task': null,  // delete
  },
})
```

### Reference Handling

When a task is deleted:
1. Find all task files with `## Blocked By` links pointing to the deleted task
2. Remove those links from the blockedBy sections
3. If a `## Blocked By` section becomes empty, leave it as `(none)`

### Package Export

Add `serializeTask` to the `@joshski/dust/patch` entry point.

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Decoupled Code](../principles/decoupled-code.md)
- [Agent Autonomy](../principles/agent-autonomy.md)
- [Small Units](../principles/small-units.md)

## Blocked By

- [Artifact Patch API: Facts](artifact-patch-api-facts.md)

## Definition of Done

- `serializeTask()` produces valid task markdown for both standard and workflow tasks
- `buildArtifactPatch()` accepts a `tasks` object alongside `facts`
- Workflow task types generate correct titles and idea links
- Deleting a task updates `## Blocked By` sections in other tasks
- Relationship validation catches invalid blockedBy or principles references
- Unit tests cover standard tasks, workflow tasks, deletion, and reference updates
- `bin/dust check` passes
